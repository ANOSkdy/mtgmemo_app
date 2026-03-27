'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

const navItems = [
  { href: '/projects', label: '案件選択', enabled: true },
  { href: '#', label: '会議メモ (準備中)', enabled: false },
  { href: '#', label: 'タスク (準備中)', enabled: false }
] as const;

export function MobileDrawer() {
  const [open, setOpen] = useState(false);
  const currentPath = usePathname();

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
                if (!item.enabled) {
                  return (
                    <span className="navItem disabled" key={item.label} aria-disabled="true">
                      {item.label}
                    </span>
                  );
                }

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
