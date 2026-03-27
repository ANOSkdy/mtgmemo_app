import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireSessionUser } from '@/lib/auth';
import { deleteTask, taskFormSchema, updateTask } from '@/lib/phase3';

export const runtime = 'nodejs';

const paramsSchema = z.object({
  taskId: z.string().uuid()
});

function asString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === 'string' ? value : '';
}

function normalizeOptional(value: string): string | undefined {
  return value.trim() === '' ? undefined : value;
}

export async function POST(request: Request, { params }: { params: { taskId: string } }) {
  const sessionUser = await requireSessionUser();
  if (sessionUser.role !== 'global') {
    return new Response('Forbidden', { status: 403 });
  }

  const parsedParams = paramsSchema.safeParse(params);
  if (!parsedParams.success) {
    return new Response('Not Found', { status: 404 });
  }

  const formData = await request.formData();
  const intent = asString(formData, 'intent');

  if (intent === 'delete') {
    const deleted = await deleteTask(parsedParams.data.taskId, sessionUser);
    if (!deleted) {
      return new Response('Not Found', { status: 404 });
    }

    return NextResponse.redirect(new URL(`/project/${deleted.projectId}/tasks`, request.url));
  }

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
    return NextResponse.redirect(
      new URL(`/admin/tasks/${parsedParams.data.taskId}/edit?error=validation`, request.url)
    );
  }

  const updated = await updateTask(parsedParams.data.taskId, parsed.data, sessionUser);
  if (!updated) {
    return NextResponse.redirect(
      new URL(`/admin/tasks/${parsedParams.data.taskId}/edit?error=validation`, request.url)
    );
  }

  return NextResponse.redirect(new URL(`/project/${updated.projectId}/tasks/${updated.id}`, request.url));
}
