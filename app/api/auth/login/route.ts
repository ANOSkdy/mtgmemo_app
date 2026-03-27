import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { setSessionCookie } from '@/lib/auth';
import { verifyUserCredentials } from '@/lib/access';

export const runtime = 'nodejs';

const loginSchema = z.object({
  email: z.string().trim().email().max(320),
  password: z.string().min(1).max(200)
});

export async function POST(request: NextRequest) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'INVALID_JSON' }, { status: 400 });
  }

  const parsed = loginSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'INVALID_BODY' }, { status: 400 });
  }

  const user = await verifyUserCredentials(parsed.data.email, parsed.data.password);
  if (!user) {
    return NextResponse.json({ ok: false, error: 'INVALID_CREDENTIALS' }, { status: 401 });
  }

  await setSessionCookie({
    userId: user.id,
    email: user.email,
    role: user.role
  });

  return NextResponse.json({ ok: true });
}
