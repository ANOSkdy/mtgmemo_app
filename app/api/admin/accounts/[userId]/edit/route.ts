import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireSessionUser } from '@/lib/auth';
import { accountUpdateSchema, deleteAccount, updateAccount } from '@/lib/phase5';

export const runtime = 'nodejs';

const paramsSchema = z.object({
  userId: z.string().uuid()
});

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

export async function POST(request: Request, context: { params: Promise<{ userId: string }> }) {
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
    const deleted = await deleteAccount(paramsParsed.data.userId, sessionUser);
    if (!deleted) {
      return NextResponse.redirect(new URL(`/admin/accounts/${paramsParsed.data.userId}/edit?error=validation`, request.url));
    }

    return NextResponse.redirect(new URL('/admin/accounts', request.url));
  }

  const password = asString(formData, 'password').trim();
  const parsed = accountUpdateSchema.safeParse({
    userId: paramsParsed.data.userId,
    name: asString(formData, 'name'),
    email: asString(formData, 'email'),
    role: asString(formData, 'role'),
    isActive: asCheckbox(formData, 'isActive'),
    password: password === '' ? undefined : password,
    projectIds: asIds(formData, 'projectIds')
  });

  if (!parsed.success) {
    return NextResponse.redirect(new URL(`/admin/accounts/${paramsParsed.data.userId}/edit?error=validation`, request.url));
  }

  const updated = await updateAccount(parsed.data, sessionUser);
  if (!updated) {
    return NextResponse.redirect(new URL(`/admin/accounts/${paramsParsed.data.userId}/edit?error=validation`, request.url));
  }

  return NextResponse.redirect(new URL('/admin/accounts', request.url));
}
