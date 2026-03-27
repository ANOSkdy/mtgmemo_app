import Link from 'next/link';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { findProjectForUser } from '@/lib/access';
import { requireSessionUser } from '@/lib/auth';
import { listMeetingNotesByProject } from '@/lib/phase2';
import { formatDate, formatDateTime } from '@/lib/phase2-view';

const paramsSchema = z.object({
  projectId: z.string().trim().min(1)
});

export default async function MeetingNotesPage({
  params
}: {
  params: Promise<{ projectId: string }>;
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

  const notes = await listMeetingNotesByProject(project.id);

  return (
    <section className="card">
      <h2>議事録一覧</h2>
      <p>{project.name}</p>
      <div className="listStack">
        {notes.length === 0 ? (
          <p>議事録はまだありません。</p>
        ) : (
          notes.map((note) => (
            <article key={note.id} className="panel listItem">
              <div className="listItemHeader">
                <h3>
                  <Link href={`/project/${project.id}/meeting-notes/${note.id}`}>{note.title}</Link>
                </h3>
              </div>
              <dl className="metaList">
                <div>
                  <dt>開催日</dt>
                  <dd>{formatDate(note.meetingDate)}</dd>
                </div>
                <div>
                  <dt>作成者</dt>
                  <dd>{note.authorName ?? '—'}</dd>
                </div>
                <div>
                  <dt>更新日時</dt>
                  <dd>{formatDateTime(note.updatedAt)}</dd>
                </div>
              </dl>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
