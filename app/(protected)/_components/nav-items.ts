export type NavItem = {
  href: string;
  label: string;
};

export function buildNavItems(pathname: string, role: "user" | "admin" | "global"): NavItem[] {
  const projectRouteMatch = pathname.match(/^\/project\/([^/]+)/);
  const projectId = projectRouteMatch?.[1];

  const baseItems: NavItem[] = [{ href: '/projects', label: '案件選択' }];

  if (role === 'global') {
    baseItems.push({ href: '/admin/projects', label: '案件管理' });
    baseItems.push({ href: '/admin/accounts', label: 'アカウント管理' });
  }

  if (!projectId) {
    return baseItems;
  }

  return [
    ...baseItems,
    { href: `/project/${projectId}`, label: '案件ホーム' },
    { href: `/project/${projectId}/meeting-notes`, label: '議事録' },
    { href: `/project/${projectId}/tasks`, label: 'タスク' },
    { href: `/project/${projectId}/files`, label: '共有フォルダ' },
    { href: `/project/${projectId}/chat`, label: 'チャット' }
  ];
}
