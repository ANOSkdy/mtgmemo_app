import { notFound } from 'next/navigation';
import { requireSessionUser } from '@/lib/auth';
import { findAccountForEdit, listProjectsForMembership, userRoles } from '@/lib/phase5';

function pickString(value: string | string[] | undefined): string {
  return typeof value === 'string' ? value : '';
}

export default async function EditAccountPage({
  params,
  searchParams
}: {
  params: Promise<{ userId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sessionUser = await requireSessionUser();
  if (sessionUser.role !== 'global') {
    notFound();
  }

  const resolvedParams = await params;
  const account = await findAccountForEdit(resolvedParams.userId);
  if (!account || account.deletedAt) {
    notFound();
  }

  const projects = await listProjectsForMembership();
  const query = await searchParams;
  const error = pickString(query.error);

  return (
    <section className="card">
      <h2>アカウント編集</h2>
      {error ? <p className="errorText">入力内容を確認してください。</p> : null}
      <form action={`/api/admin/accounts/${account.id}/edit`} method="post" className="entityForm">
        <label>
          名前
          <input name="name" type="text" required maxLength={100} defaultValue={account.name} />
        </label>
        <label>
          メールアドレス
          <input name="email" type="email" required maxLength={255} defaultValue={account.email} />
        </label>
        <label>
          パスワード（変更時のみ）
          <input name="password" type="password" minLength={8} maxLength={200} />
        </label>
        <label>
          ロール
          <select name="role" defaultValue={account.role} required>
            {userRoles.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </label>
        <label className="checkboxLabel">
          <input type="checkbox" name="isActive" defaultChecked={account.isActive} />
          有効アカウント
        </label>
        <fieldset className="checkboxGroup">
          <legend>案件紐付け</legend>
          {projects.map((project) => (
            <label key={project.id} className="checkboxLabel">
              <input
                type="checkbox"
                name="projectIds"
                value={project.id}
                defaultChecked={account.projectIds.includes(project.id)}
              />
              {project.name}
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
