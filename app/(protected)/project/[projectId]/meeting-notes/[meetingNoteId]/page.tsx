import Link from 'next/link';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { findProjectForUser } from '@/lib/access';
import { requireSessionUser } from '@/lib/auth';
import { findMeetingNoteDetail, listTasksByMeetingNote } from '@/lib/phase2';
import { formatDate, formatDateTime, priorityBadgeClassName, priorityLabels, statusLabels } from '@/lib/phase2-view';

const paramsSchema = z.object({
  projectId: z.string().trim().min(1),
  meetingNoteId: z.string().trim().min(1)
});

export default async function MeetingNoteDetailPage({
  params
}: {
  params: Promise<{ projectId: string; meetingNoteId: string }>;
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

  const note = await findMeetingNoteDetail(project.id, parsed.data.meetingNoteId);
  if (!note) {
    notFound();
  }

  const relatedTasks = await listTasksByMeetingNote(project.id, note.id);

  return (
    <section className="card">
      <div className="cardHeaderRow">
        <h2>{note.title}</h2>
        <div className="formActions">
          {sessionUser.role === 'global' ? (
            <Link href={`/admin/meeting-notes/${note.id}/edit`} className="secondaryButton">
              編集
            </Link>
          ) : null}
          <Link href={`/project/${project.id}/meeting-notes`} className="secondaryButton">
            一覧へ戻る
          </Link>
        </div>
      </div>
      <dl className="metaList">
        <div>
          <dt>開催日</dt>
          <dd>{formatDate(note.meetingDate)}</dd>
        </div>
        <div>
          <dt>作成者</dt>
          <dd>{note.createdByName ?? '—'}</dd>
        </div>
        <div>
          <dt>更新者</dt>
          <dd>{note.updatedByName ?? '—'}</dd>
        </div>
        <div>
          <dt>更新日時</dt>
          <dd>{formatDateTime(note.updatedAt)}</dd>
        </div>
      </dl>

      <article className="panel">
        <h3>内容</h3>
        <p className="plainText">{note.content || '（内容なし）'}</p>
      </article>

      <article className="panel">
        <h3>関連タスク</h3>
        {relatedTasks.length === 0 ? (
          <p>関連タスクはありません。</p>
        ) : (
          <ul className="simpleList">
            {relatedTasks.map((task) => (
              <li key={task.id} className="simpleListItem">
                <Link href={`/project/${project.id}/tasks/${task.id}`}>{task.title}</Link>
                <span className="badge">{statusLabels[task.status]}</span>
                <span className={`badge ${priorityBadgeClassName[task.priority]}`}>
                  {priorityLabels[task.priority]}
                </span>
              </li>
            ))}
          </ul>
        )}
      </article>
    </section>
  );
}
