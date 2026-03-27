import type { TaskPriority, TaskStatus } from '@/lib/phase2';

export const statusLabels: Record<TaskStatus, string> = {
  not_started: '未着手',
  in_progress: '対応中',
  done: '完了'
};

export const priorityLabels: Record<TaskPriority, string> = {
  high: '高',
  medium: '中',
  low: '低'
};

export const priorityBadgeClassName: Record<TaskPriority, string> = {
  high: 'badgePriorityHigh',
  medium: 'badgePriorityMedium',
  low: 'badgePriorityLow'
};

export function formatDate(value: string | null): string {
  if (!value) {
    return '—';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString('ja-JP');
}

export function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}
