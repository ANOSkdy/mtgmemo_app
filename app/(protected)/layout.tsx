import Link from 'next/link';
import { requireSessionUser } from '@/lib/auth';
import { MobileDrawer } from '@/app/(protected)/_components/mobile-drawer';
import { SidebarNav } from '@/app/(protected)/_components/sidebar-nav';

export default async function ProtectedLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  const sessionUser = await requireSessionUser();

  return (
    <div className="appShell">
      <aside className="sidebar">
        <div>
          <h1 className="appTitle">MTG Memo</h1>
          <p className="appSubtitle">{sessionUser.email}</p>
          <SidebarNav role={sessionUser.role} />
        </div>
        <form action="/api/auth/logout" method="post">
          <button type="submit" className="secondaryButton fullWidth">
            ログアウト
          </button>
        </form>
      </aside>

      <div className="mainArea">
        <header className="topBar">
          <MobileDrawer role={sessionUser.role} />
          <div>
            <strong>{sessionUser.email}</strong>
            <span className="roleBadge">{sessionUser.role}</span>
          </div>
          <div className="topBarActions">
            <Link href="/projects" className="secondaryButton">
              案件一覧
            </Link>
            <form action="/api/auth/logout" method="post">
              <button type="submit" className="secondaryButton">
                ログアウト
              </button>
            </form>
          </div>
        </header>
        <main className="content">{children}</main>
      </div>
    </div>
  );
}
