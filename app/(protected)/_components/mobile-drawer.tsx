'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

import { buildNavItems } from '@/app/(protected)/_components/nav-items';

export function MobileDrawer({ role }: { role: "user" | "admin" | "global" }) {
  const [open, setOpen] = useState(false);
  const currentPath = usePathname();

  const navItems = buildNavItems(currentPath, role);

  return (
    <>
      <button className="menuButton" type="button" onClick={() => setOpen(true)} aria-label="メニューを開く">
        ☰
      </button>
      {open ? (
        <div className="drawerOverlay" role="presentation" onClick={() => setOpen(false)}>
          <aside className="drawer" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <div className="drawerHeader">
              <strong>MTG Memo</strong>
              <button type="button" onClick={() => setOpen(false)} aria-label="メニューを閉じる">
                ✕
              </button>
            </div>
            <nav className="navList" aria-label="モバイルナビゲーション">
              {navItems.map((item) => {
                const isActive = currentPath === item.href;

                return (
                  <Link
                    className={`navItem${isActive ? ' active' : ''}`}
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </aside>
        </div>
      ) : null}
    </>
  );
}
