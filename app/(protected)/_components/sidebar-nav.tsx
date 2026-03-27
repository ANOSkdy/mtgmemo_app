'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { buildNavItems } from '@/app/(protected)/_components/nav-items';

export function SidebarNav() {
  const currentPath = usePathname();

  const navItems = buildNavItems(currentPath);

  return (
    <nav className="navList" aria-label="サイドナビゲーション">
      {navItems.map((item) => {
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
