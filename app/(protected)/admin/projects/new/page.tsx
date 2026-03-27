import { notFound } from 'next/navigation';
import { requireSessionUser } from '@/lib/auth';
import { listUsersForMembership, projectStatuses } from '@/lib/phase5';

function pickString(value: string | string[] | undefined): string {
  return typeof value === 'string' ? value : '';
}

export default async function NewProjectPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sessionUser = await requireSessionUser();
  if (sessionUser.role !== 'global') {
    notFound();
  }

  const users = await listUsersForMembership();
  const params = await searchParams;
  const error = pickString(params.error);

  return (
    <section className="card">
      <h2>案件新規登録</h2>
      {error ? <p className="errorText">入力内容を確認してください。</p> : null}
      <form action="/api/admin/projects/new" method="post" className="entityForm">
        <label>
          案件名
          <input name="projectName" type="text" required maxLength={200} />
        </label>
        <label>
          顧客名
          <input name="clientName" type="text" required maxLength={200} />
        </label>
        <label>
          説明
          <textarea name="description" rows={5} maxLength={5000} />
        </label>
        <label>
          開始日
          <input name="startDate" type="date" />
        </label>
        <label>
          終了日
          <input name="endDate" type="date" />
        </label>
        <label>
          ステータス
          <select name="status" defaultValue="planned" required>
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
              <input type="checkbox" name="memberIds" value={user.id} />
              {user.name} ({user.email})
            </label>
          ))}
        </fieldset>
        <div className="formActions">
          <button type="submit">登録</button>
        </div>
      </form>
    </section>
  );
}
