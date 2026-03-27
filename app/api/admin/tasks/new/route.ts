import { NextResponse } from 'next/server';
import { requireSessionUser } from '@/lib/auth';
import { createTask, taskFormSchema } from '@/lib/phase3';

export const runtime = 'nodejs';

function asString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === 'string' ? value : '';
}

function normalizeOptional(value: string): string | undefined {
  return value.trim() === '' ? undefined : value;
}

export async function POST(request: Request) {
  const sessionUser = await requireSessionUser();
  if (sessionUser.role !== 'global') {
    return new Response('Forbidden', { status: 403 });
  }

  const formData = await request.formData();
  const parsed = taskFormSchema.safeParse({
    projectId: asString(formData, 'projectId'),
    title: asString(formData, 'title'),
    description: normalizeOptional(asString(formData, 'description')),
    status: asString(formData, 'status'),
    priority: asString(formData, 'priority'),
    assigneeUserId: normalizeOptional(asString(formData, 'assigneeUserId')),
    dueDate: normalizeOptional(asString(formData, 'dueDate')),
    relatedMeetingNoteId: normalizeOptional(asString(formData, 'relatedMeetingNoteId'))
  });

  if (!parsed.success) {
    return NextResponse.redirect(new URL('/admin/tasks/new?error=validation', request.url));
  }

  const taskId = await createTask(parsed.data, sessionUser);
  if (!taskId) {
    return NextResponse.redirect(new URL('/admin/tasks/new?error=validation', request.url));
  }

  return NextResponse.redirect(new URL(`/project/${parsed.data.projectId}/tasks/${taskId}`, request.url));
}
