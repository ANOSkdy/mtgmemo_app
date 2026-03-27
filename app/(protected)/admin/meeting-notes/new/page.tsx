import { notFound } from 'next/navigation';
import { requireSessionUser } from '@/lib/auth';
import { listProjectOptions } from '@/lib/phase3';

function pickString(value: string | string[] | undefined): string {
  return typeof value === 'string' ? value : '';
}

export default async function NewMeetingNotePage({
  searchParams
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const sessionUser = await requireSessionUser();
  if (sessionUser.role !== 'global') {
    notFound();
  }

  const projects = await listProjectOptions();

  if (projects.length === 0) {
    return (
      <section className="card">
        <h2>議事録作成</h2>
        <p>利用可能な案件がありません。</p>
      </section>
    );
  }

  const selectedProjectId = pickString(searchParams.projectId);
  const error = pickString(searchParams.error);

  return (
    <section className="card">
      <h2>議事録作成</h2>
      {error ? <p className="errorText">入力内容を確認してください。</p> : null}
      <form action="/api/admin/meeting-notes/new" method="post" className="entityForm">
        <label>
          案件
          <select name="projectId" defaultValue={selectedProjectId || projects[0]?.id} required>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          タイトル
          <input name="title" type="text" required maxLength={200} />
        </label>
        <label>
          開催日
          <input name="meetingDate" type="date" required />
        </label>
        <label>
          内容
          <textarea name="content" rows={12} required />
        </label>
        <div className="formActions">
          <button type="submit">登録</button>
        </div>
      </form>
    </section>
  );
}
