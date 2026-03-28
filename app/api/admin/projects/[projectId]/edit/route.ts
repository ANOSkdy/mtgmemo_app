import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireSessionUser } from '@/lib/auth';
import { deleteProject, projectUpdateSchema, updateProject } from '@/lib/phase5';

export const runtime = 'nodejs';

const paramsSchema = z.object({
  projectId: z.string().uuid()
});

function asString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === 'string' ? value : '';
}

function asIds(formData: FormData, key: string): string[] {
  return formData
    .getAll(key)
    .filter((value): value is string => typeof value === 'string')
    .map((value) => value.trim())
    .filter(Boolean);
}

function normalizeOptional(value: string): string | undefined {
  return value.trim() === '' ? undefined : value;
}

export async function POST(request: Request, context: { params: Promise<{ projectId: string }> }) {
  const sessionUser = await requireSessionUser();
  if (sessionUser.role !== 'global') {
    return new Response('Forbidden', { status: 403 });
  }

  const paramsParsed = paramsSchema.safeParse(await context.params);
  if (!paramsParsed.success) {
    return new Response('Bad Request', { status: 400 });
  }

  const formData = await request.formData();
  const intent = asString(formData, 'intent');

  if (intent === 'delete') {
    const deleted = await deleteProject(paramsParsed.data.projectId, sessionUser);
    if (!deleted) {
      return NextResponse.redirect(new URL(`/admin/projects/${paramsParsed.data.projectId}/edit?error=validation`, request.url));
    }

    return NextResponse.redirect(new URL('/admin/projects', request.url));
  }

  const parsed = projectUpdateSchema.safeParse({
    projectId: paramsParsed.data.projectId,
    projectName: asString(formData, 'projectName'),
    clientName: asString(formData, 'clientName'),
    description: normalizeOptional(asString(formData, 'description')),
    startDate: normalizeOptional(asString(formData, 'startDate')),
    endDate: normalizeOptional(asString(formData, 'endDate')),
    status: asString(formData, 'status'),
    memberIds: asIds(formData, 'memberIds')
  });

  if (!parsed.success) {
    return NextResponse.redirect(new URL(`/admin/projects/${paramsParsed.data.projectId}/edit?error=validation`, request.url));
  }

  const updated = await updateProject(parsed.data, sessionUser);
  if (!updated) {
    return NextResponse.redirect(new URL(`/admin/projects/${paramsParsed.data.projectId}/edit?error=validation`, request.url));
  }

  return NextResponse.redirect(new URL('/admin/projects', request.url));
}
