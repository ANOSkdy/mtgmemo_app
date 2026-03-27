export type NavItem = {
  href: string;
  label: string;
};

export function buildNavItems(pathname: string): NavItem[] {
  const projectRouteMatch = pathname.match(/^\/project\/([^/]+)/);
  const projectId = projectRouteMatch?.[1];

  const baseItems: NavItem[] = [{ href: '/projects', label: '案件選択' }];

  if (!projectId) {
    return baseItems;
  }

  return [
    ...baseItems,
    { href: `/project/${projectId}`, label: '案件ホーム' },
    { href: `/project/${projectId}/meeting-notes`, label: '議事録' },
    { href: `/project/${projectId}/tasks`, label: 'タスク' }
  ];
}
