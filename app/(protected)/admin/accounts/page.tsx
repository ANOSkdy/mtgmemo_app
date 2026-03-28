import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireSessionUser } from '@/lib/auth';
import { listAccounts } from '@/lib/phase5';

function roleLabel(role: 'user' | 'admin' | 'global') {
  return role;
}

export default async function AccountsPage() {
  const sessionUser = await requireSessionUser();
  if (sessionUser.role !== 'global') {
    notFound();
  }

  const accounts = await listAccounts();

  return (
    <section className="card">
      <div className="cardHeaderRow">
        <h2>アカウント管理</h2>
        <Link href="/admin/accounts/new" className="secondaryButton">
          新規登録
        </Link>
      </div>
      {accounts.length === 0 ? (
        <p>アカウントがありません。</p>
      ) : (
        <ul className="simpleList">
          {accounts.map((account) => (
            <li key={account.id} className="simpleListItem">
              <div className="listItemHeader">
                <strong className="safeBreak">{account.name}</strong>
                <div className="badgeGroup">
                  <span className="badge">{roleLabel(account.role)}</span>
                  <span className="badge">{account.isActive ? 'active' : 'inactive'}</span>
                  {account.deletedAt ? <span className="badge">deleted</span> : null}
                </div>
              </div>
              <p className="safeBreak">{account.email}</p>
              {!account.deletedAt ? (
                <Link href={`/admin/accounts/${account.id}/edit`} className="secondaryButton">
                  編集
                </Link>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
