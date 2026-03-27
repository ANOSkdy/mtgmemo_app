'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/projects', label: '案件選択', enabled: true },
  { href: '#', label: '会議メモ (準備中)', enabled: false },
  { href: '#', label: 'タスク (準備中)', enabled: false }
] as const;

export function SidebarNav() {
  const currentPath = usePathname();

  return (
    <nav className="navList" aria-label="サイドナビゲーション">
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
          <Link className={`navItem${isActive ? ' active' : ''}`} key={item.href} href={item.href}>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
