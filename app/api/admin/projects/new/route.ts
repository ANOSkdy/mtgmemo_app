import { NextResponse } from 'next/server';
import { requireSessionUser } from '@/lib/auth';
import { createProject, projectCreateSchema } from '@/lib/phase5';

export const runtime = 'nodejs';

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

export async function POST(request: Request) {
  const sessionUser = await requireSessionUser();
  if (sessionUser.role !== 'global') {
    return new Response('Forbidden', { status: 403 });
  }

  const formData = await request.formData();
  const parsed = projectCreateSchema.safeParse({
    projectName: asString(formData, 'projectName'),
    clientName: asString(formData, 'clientName'),
    description: normalizeOptional(asString(formData, 'description')),
    startDate: normalizeOptional(asString(formData, 'startDate')),
    endDate: normalizeOptional(asString(formData, 'endDate')),
    status: asString(formData, 'status'),
    memberIds: asIds(formData, 'memberIds')
  });

  if (!parsed.success) {
    return NextResponse.redirect(new URL('/admin/projects/new?error=validation', request.url));
  }

  const created = await createProject(parsed.data, sessionUser);
  if (!created) {
    return NextResponse.redirect(new URL('/admin/projects/new?error=validation', request.url));
  }

  return NextResponse.redirect(new URL('/admin/projects', request.url));
}
