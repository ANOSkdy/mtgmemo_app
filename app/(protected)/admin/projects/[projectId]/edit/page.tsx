import { notFound } from 'next/navigation';
import { requireSessionUser } from '@/lib/auth';
import { findProjectForEdit, listUsersForMembership, projectStatuses } from '@/lib/phase5';

function pickString(value: string | string[] | undefined): string {
  return typeof value === 'string' ? value : '';
}

export default async function EditProjectPage({
  params,
  searchParams
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sessionUser = await requireSessionUser();
  if (sessionUser.role !== 'global') {
    notFound();
  }

  const resolvedParams = await params;
  const project = await findProjectForEdit(resolvedParams.projectId);
  if (!project || project.deletedAt) {
    notFound();
  }

  const users = await listUsersForMembership();
  const query = await searchParams;
  const error = pickString(query.error);

  return (
    <section className="card">
      <h2>案件編集</h2>
      {error ? <p className="errorText">入力内容を確認してください。</p> : null}
      <form action={`/api/admin/projects/${project.id}/edit`} method="post" className="entityForm">
        <label>
          案件名
          <input name="projectName" type="text" required maxLength={200} defaultValue={project.projectName} />
        </label>
        <label>
          顧客名
          <input name="clientName" type="text" required maxLength={200} defaultValue={project.clientName} />
        </label>
        <label>
          説明
          <textarea name="description" rows={5} maxLength={5000} defaultValue={project.description} />
        </label>
        <label>
          開始日
          <input name="startDate" type="date" defaultValue={project.startDate ?? ''} />
        </label>
        <label>
          終了日
          <input name="endDate" type="date" defaultValue={project.endDate ?? ''} />
        </label>
        <label>
          ステータス
          <select name="status" defaultValue={project.status} required>
            {projectStatuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>
        <fieldset className="checkboxGroup">
          <legend>メンバー</legend>
          {users.map((user) => (
            <label key={user.id} className="checkboxLabel">
              <input
                type="checkbox"
                name="memberIds"
                value={user.id}
                defaultChecked={project.memberIds.includes(user.id)}
              />
              {user.name} ({user.email})
            </label>
          ))}
        </fieldset>
        <div className="formActions">
          <button type="submit">更新</button>
          <button type="submit" name="intent" value="delete" className="dangerButton">
            論理削除
          </button>
        </div>
      </form>
    </section>
  );
}
