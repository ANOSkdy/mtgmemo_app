import Link from 'next/link';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { findProjectForUser } from '@/lib/access';
import { requireSessionUser } from '@/lib/auth';
import { query } from '@/lib/db';
import { formatDate, formatDateTime, statusLabels } from '@/lib/phase2-view';
import type { TaskStatus } from '@/lib/phase2';

const paramsSchema = z.object({
  projectId: z.string().trim().min(1)
});

type ProjectDetailRow = {
  id: string;
  projectName: string;
  clientName: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
  description: string | null;
  updatedAt: string;
};

type ProjectSummaryRow = {
  meetingNotesCount: number;
  openTasksCount: number;
  completedTasksCount: number;
  memberCount: number;
};

type RecentMeetingNote = {
  id: string;
  title: string;
  meetingDate: string | null;
  updatedAt: string;
};

type RecentTask = {
  id: string;
  title: string;
  status: TaskStatus;
  dueDate: string | null;
  updatedAt: string;
};

type RecentFile = {
  id: string;
  fileName: string;
  createdAt: string;
};

type RecentChat = {
  id: string;
  message: string;
  postedByName: string;
  createdAt: string;
};

const projectStatusLabels: Record<string, string> = {
  planned: '計画中',
  active: '進行中',
  completed: '完了',
  paused: '一時停止'
};

export default async function ProjectHomePage({
  params
}: {
  params: Promise<{ projectId: string }>;
}) {
  const sessionUser = await requireSessionUser();
  const parsed = paramsSchema.safeParse(await params);

  if (!parsed.success) {
    notFound();
  }

  const project = await findProjectForUser(
    parsed.data.projectId,
    sessionUser.userId,
    sessionUser.role
  );

  if (!project) {
    notFound();
  }

  const [projectResult, summaryResult, meetingNotesResult, tasksResult, filesResult, chatResult] =
    await Promise.all([
      query<ProjectDetailRow>(
        `SELECT p.id::text,
                p.project_name AS "projectName",
                p.client_name AS "clientName",
                p.status,
                p.start_date::text AS "startDate",
                p.end_date::text AS "endDate",
                p.description,
                p.updated_at::text AS "updatedAt"
         FROM projects p
         WHERE p.id = $1
           AND p.deleted_at IS NULL
         LIMIT 1`,
        [project.id]
      ),
      query<ProjectSummaryRow>(
        `SELECT
            (SELECT COUNT(*)::int
             FROM meeting_notes mn
             WHERE mn.project_id = $1
               AND mn.deleted_at IS NULL) AS "meetingNotesCount",
            (SELECT COUNT(*)::int
             FROM tasks t
             WHERE t.project_id = $1
               AND t.deleted_at IS NULL
               AND t.status IN ('not_started', 'in_progress')) AS "openTasksCount",
            (SELECT COUNT(*)::int
             FROM tasks t
             WHERE t.project_id = $1
               AND t.deleted_at IS NULL
               AND t.status = 'done') AS "completedTasksCount",
            (SELECT COUNT(DISTINCT pm.user_id)::int
             FROM project_members pm
             INNER JOIN users u
               ON u.id = pm.user_id
              AND u.deleted_at IS NULL
              AND u.is_active = TRUE
             WHERE pm.project_id = $1
               AND pm.deleted_at IS NULL) AS "memberCount"`,
        [project.id]
      ),
      query<RecentMeetingNote>(
        `SELECT mn.id::text,
                mn.title,
                mn.meeting_date::text AS "meetingDate",
                mn.updated_at::text AS "updatedAt"
         FROM meeting_notes mn
         WHERE mn.project_id = $1
           AND mn.deleted_at IS NULL
         ORDER BY mn.meeting_date DESC NULLS LAST, mn.updated_at DESC
         LIMIT 3`,
        [project.id]
      ),
      query<RecentTask>(
        `SELECT t.id::text,
                t.title,
                t.status,
                t.due_date::text AS "dueDate",
                t.updated_at::text AS "updatedAt"
         FROM tasks t
         WHERE t.project_id = $1
           AND t.deleted_at IS NULL
         ORDER BY t.updated_at DESC
         LIMIT 3`,
        [project.id]
      ),
      query<RecentFile>(
        `SELECT f.id::text,
                f.file_name AS "fileName",
                f.created_at::text AS "createdAt"
         FROM files f
         WHERE f.project_id = $1
           AND f.deleted_at IS NULL
         ORDER BY f.created_at DESC
         LIMIT 3`,
        [project.id]
      ),
      query<RecentChat>(
        `SELECT cm.id::text,
                cm.message,
                COALESCE(u.name, u.email) AS "postedByName",
                cm.created_at::text AS "createdAt"
         FROM chat_messages cm
         INNER JOIN users u
           ON u.id = cm.posted_by
          AND u.deleted_at IS NULL
         WHERE cm.project_id = $1
           AND cm.deleted_at IS NULL
         ORDER BY cm.created_at DESC
         LIMIT 3`,
        [project.id]
      )
    ]);

  const projectDetail = projectResult.rows[0];
  if (!projectDetail) {
    notFound();
  }

  const summary = summaryResult.rows[0] ?? {
    meetingNotesCount: 0,
    openTasksCount: 0,
    completedTasksCount: 0,
    memberCount: 0
  };

  return (
    <section className="card">
      <h2>{projectDetail.projectName}</h2>
      <div className="projectHomeGrid">
        <article className="panel">
          <h3>案件基本情報</h3>
          <dl className="metaList">
            <div>
              <dt>案件名</dt>
              <dd>{projectDetail.projectName}</dd>
            </div>
            <div>
              <dt>取引先</dt>
              <dd>{projectDetail.clientName}</dd>
            </div>
            <div>
              <dt>ステータス</dt>
              <dd>{projectStatusLabels[projectDetail.status] ?? projectDetail.status}</dd>
            </div>
            <div>
              <dt>期間</dt>
              <dd>
                {formatDate(projectDetail.startDate)} 〜 {formatDate(projectDetail.endDate)}
              </dd>
            </div>
            <div>
              <dt>最終更新</dt>
              <dd>{formatDateTime(projectDetail.updatedAt)}</dd>
            </div>
          </dl>
          {projectDetail.description ? (
            <p className="plainText">{projectDetail.description}</p>
          ) : (
            <p>概要は未登録です。</p>
          )}
        </article>

        <article className="panel">
          <h3>サマリー</h3>
          <dl className="metaList">
            <div>
              <dt>議事録</dt>
              <dd>{summary.meetingNotesCount} 件</dd>
            </div>
            <div>
              <dt>未完了タスク</dt>
              <dd>{summary.openTasksCount} 件</dd>
            </div>
            <div>
              <dt>完了タスク</dt>
              <dd>{summary.completedTasksCount} 件</dd>
            </div>
            <div>
              <dt>メンバー</dt>
              <dd>{summary.memberCount} 名</dd>
            </div>
          </dl>
          <h3>メニュー</h3>
          <ul>
            <li>
              <Link href={`/project/${project.id}/meeting-notes`}>
                議事録一覧（{summary.meetingNotesCount}）
              </Link>
            </li>
            <li>
              <Link href={`/project/${project.id}/tasks`}>
                タスク一覧（未完了 {summary.openTasksCount}）
              </Link>
            </li>
            <li>
              <Link href={`/project/${project.id}/files`}>共有フォルダ</Link>
            </li>
            <li>
              <Link href={`/project/${project.id}/chat`}>グループチャット</Link>
            </li>
          </ul>
        </article>

        <article className="panel">
          <h3>最新の議事録</h3>
          {meetingNotesResult.rows.length === 0 ? (
            <p>議事録はまだありません。</p>
          ) : (
            <ul className="simpleList">
              {meetingNotesResult.rows.map((note) => (
                <li key={note.id} className="simpleListItem">
                  <Link href={`/project/${project.id}/meeting-notes/${note.id}`}>{note.title}</Link>
                  <p>
                    開催日: {formatDate(note.meetingDate)} / 更新: {formatDateTime(note.updatedAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </article>

        <article className="panel">
          <h3>直近のタスク更新</h3>
          {tasksResult.rows.length === 0 ? (
            <p>タスクはまだありません。</p>
          ) : (
            <ul className="simpleList">
              {tasksResult.rows.map((task) => (
                <li key={task.id} className="simpleListItem">
                  <Link href={`/project/${project.id}/tasks/${task.id}`}>{task.title}</Link>
                  <p>
                    状態: {statusLabels[task.status]} / 期限: {formatDate(task.dueDate)} / 更新:{' '}
                    {formatDateTime(task.updatedAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </article>

        <article className="panel">
          <h3>最新の共有ファイル</h3>
          {filesResult.rows.length === 0 ? (
            <p>共有ファイルはまだありません。</p>
          ) : (
            <ul className="simpleList">
              {filesResult.rows.map((file) => (
                <li key={file.id} className="simpleListItem">
                  <p className="safeBreak">{file.fileName}</p>
                  <p>登録: {formatDateTime(file.createdAt)}</p>
                </li>
              ))}
            </ul>
          )}
        </article>

        <article className="panel">
          <h3>最新のチャット</h3>
          {chatResult.rows.length === 0 ? (
            <p>メッセージはまだありません。</p>
          ) : (
            <ul className="simpleList">
              {chatResult.rows.map((message) => (
                <li key={message.id} className="simpleListItem">
                  <p className="safeBreak">{message.message}</p>
                  <p>
                    {message.postedByName} / {formatDateTime(message.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </article>
      </div>
      <Link href="/projects" className="secondaryButton">
        案件選択へ戻る
      </Link>
    </section>
  );
}
