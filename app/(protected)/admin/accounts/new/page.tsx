import { notFound } from 'next/navigation';
import { requireSessionUser } from '@/lib/auth';
import { listProjectsForMembership, userRoles } from '@/lib/phase5';

function pickString(value: string | string[] | undefined): string {
  return typeof value === 'string' ? value : '';
}

export default async function NewAccountPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sessionUser = await requireSessionUser();
  if (sessionUser.role !== 'global') {
    notFound();
  }

  const projects = await listProjectsForMembership();
  const params = await searchParams;
  const error = pickString(params.error);

  return (
    <section className="card">
      <h2>アカウント新規登録</h2>
      {error ? <p className="errorText">入力内容を確認してください。</p> : null}
      <form action="/api/admin/accounts/new" method="post" className="entityForm">
        <label>
          名前
          <input name="name" type="text" required maxLength={100} />
        </label>
        <label>
          メールアドレス
          <input name="email" type="email" required maxLength={255} />
        </label>
        <label>
          初期パスワード
          <input name="password" type="password" required minLength={8} maxLength={200} />
        </label>
        <label>
          ロール
          <select name="role" defaultValue="user" required>
            {userRoles.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </label>
        <label className="checkboxLabel">
          <input type="checkbox" name="isActive" defaultChecked />
          有効アカウント
        </label>
        <fieldset className="checkboxGroup">
          <legend>案件紐付け</legend>
          {projects.length === 0 ? <p>案件がありません。</p> : null}
          {projects.map((project) => (
            <label key={project.id} className="checkboxLabel">
              <input type="checkbox" name="projectIds" value={project.id} />
              {project.name}
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
