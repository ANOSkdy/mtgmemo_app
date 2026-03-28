import { NextResponse } from 'next/server';
import { requireSessionUser } from '@/lib/auth';
import { accountCreateSchema, createAccount } from '@/lib/phase5';

export const runtime = 'nodejs';

function asString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === 'string' ? value : '';
}

function asCheckbox(formData: FormData, key: string): boolean {
  return formData.get(key) === 'on';
}

function asIds(formData: FormData, key: string): string[] {
  return formData
    .getAll(key)
    .filter((value): value is string => typeof value === 'string')
    .map((value) => value.trim())
    .filter(Boolean);
}

export async function POST(request: Request) {
  const sessionUser = await requireSessionUser();
  if (sessionUser.role !== 'global') {
    return new Response('Forbidden', { status: 403 });
  }

  const formData = await request.formData();
  const parsed = accountCreateSchema.safeParse({
    name: asString(formData, 'name'),
    email: asString(formData, 'email'),
    password: asString(formData, 'password'),
    role: asString(formData, 'role'),
    isActive: asCheckbox(formData, 'isActive'),
    projectIds: asIds(formData, 'projectIds')
  });

  if (!parsed.success) {
    return NextResponse.redirect(new URL('/admin/accounts/new?error=validation', request.url));
  }

  const created = await createAccount(parsed.data, sessionUser);
  if (!created) {
    return NextResponse.redirect(new URL('/admin/accounts/new?error=validation', request.url));
  }

  return NextResponse.redirect(new URL('/admin/accounts', request.url));
}
