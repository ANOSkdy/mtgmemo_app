import { notFound } from 'next/navigation';
import { z } from 'zod';
import { requireSessionUser } from '@/lib/auth';
import { findMeetingNoteForEdit, listProjectOptions } from '@/lib/phase3';

const paramsSchema = z.object({
  meetingNoteId: z.string().uuid()
});

function pickString(value: string | string[] | undefined): string {
  return typeof value === 'string' ? value : '';
}

export default async function EditMeetingNotePage({
  params,
  searchParams
}: {
  params: Promise<{ meetingNoteId: string }>;
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const sessionUser = await requireSessionUser();
  if (sessionUser.role !== 'global') {
    notFound();
  }

  const parsedParams = paramsSchema.safeParse(await params);
  if (!parsedParams.success) {
    notFound();
  }

  const [note, projects] = await Promise.all([
    findMeetingNoteForEdit(parsedParams.data.meetingNoteId),
    listProjectOptions()
  ]);

  if (!note) {
    notFound();
  }

  const error = pickString(searchParams.error);

  return (
    <section className="card">
      <h2>議事録編集</h2>
      {error ? <p className="errorText">入力内容を確認してください。</p> : null}
      <form action={`/api/admin/meeting-notes/${note.id}/edit`} method="post" className="entityForm">
        <label>
          案件
          <select name="projectId" defaultValue={note.projectId} required>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          タイトル
          <input name="title" type="text" required defaultValue={note.title} maxLength={200} />
        </label>
        <label>
          開催日
          <input name="meetingDate" type="date" required defaultValue={note.meetingDate} />
        </label>
        <label>
          内容
          <textarea name="content" rows={12} required defaultValue={note.content} />
        </label>
        <div className="formActions">
          <button type="submit" name="intent" value="update">
            保存
          </button>
          <button type="submit" name="intent" value="delete" className="dangerButton">
            削除
          </button>
        </div>
      </form>
    </section>
  );
}
