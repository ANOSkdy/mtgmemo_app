import Link from 'next/link';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { findProjectForUser } from '@/lib/access';
import { requireSessionUser } from '@/lib/auth';
import { findTaskDetail, listTaskComments } from '@/lib/phase2';
import { formatDate, formatDateTime, priorityBadgeClassName, priorityLabels, statusLabels } from '@/lib/phase2-view';

const paramsSchema = z.object({
  projectId: z.string().trim().min(1),
  taskId: z.string().trim().min(1)
});

export default async function TaskDetailPage({
  params
}: {
  params: Promise<{ projectId: string; taskId: string }>;
}) {
  const sessionUser = await requireSessionUser();
  const parsed = paramsSchema.safeParse(await params);

  if (!parsed.success) {
    notFound();
  }

  const project = await findProjectForUser(parsed.data.projectId, sessionUser.userId, sessionUser.role);
  if (!project) {
    notFound();
  }

  const task = await findTaskDetail(project.id, parsed.data.taskId);
  if (!task) {
    notFound();
  }

  const comments = await listTaskComments(task.id);

  return (
    <section className="card">
      <div className="cardHeaderRow">
        <h2>{task.title}</h2>
        <Link href={`/project/${project.id}/tasks`} className="secondaryButton">
          一覧へ戻る
        </Link>
      </div>

      <div className="badgeGroup">
        <span className="badge">{statusLabels[task.status]}</span>
        <span className={`badge ${priorityBadgeClassName[task.priority]}`}>{priorityLabels[task.priority]}</span>
      </div>

      <dl className="metaList">
        <div>
          <dt>担当者</dt>
          <dd>{task.assigneeName ?? '—'}</dd>
        </div>
        <div>
          <dt>期限</dt>
          <dd>{formatDate(task.dueDate)}</dd>
        </div>
        <div>
          <dt>更新日時</dt>
          <dd>{formatDateTime(task.updatedAt)}</dd>
        </div>
        <div>
          <dt>関連議事録</dt>
          <dd>
            {task.relatedMeetingNoteId ? (
              <Link href={`/project/${project.id}/meeting-notes/${task.relatedMeetingNoteId}`}>
                {task.relatedMeetingNoteTitle ?? '議事録を開く'}
              </Link>
            ) : (
              '—'
            )}
          </dd>
        </div>
      </dl>

      <article className="panel">
        <h3>詳細</h3>
        <p className="plainText">{task.description || '（詳細なし）'}</p>
      </article>

      <article className="panel">
        <h3>コメント</h3>
        {comments.length === 0 ? (
          <p>コメントはまだありません。</p>
        ) : (
          <ul className="simpleList">
            {comments.map((comment) => (
              <li key={comment.id} className="commentItem">
                <p className="plainText">{comment.comment}</p>
                <small>
                  {comment.createdByName ?? '—'} / {formatDateTime(comment.createdAt)}
                </small>
              </li>
            ))}
          </ul>
        )}
      </article>
    </section>
  );
}
