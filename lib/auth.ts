import 'server-only';

import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

const SESSION_COOKIE = 'mtgmemo_session';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

export type AppRole = 'user' | 'admin' | 'global';

export type SessionUser = {
  userId: string;
  email: string;
  role: AppRole;
  exp: number;
};

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error('MISSING_SESSION_SECRET');
  }

  return secret;
}

function toBase64Url(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function fromBase64Url(value: string): string | null {
  try {
    return Buffer.from(value, 'base64url').toString('utf8');
  } catch {
    return null;
  }
}

function signPayload(payload: string): string {
  return createHmac('sha256', getSessionSecret()).update(payload).digest('base64url');
}

function serializeSession(session: SessionUser): string {
  const payload = toBase64Url(JSON.stringify(session));
  const signature = signPayload(payload);
  return `${payload}.${signature}`;
}

function parseSession(token: string | undefined): SessionUser | null {
  if (!token) {
    return null;
  }

  const [payload, signature] = token.split('.');

  if (!payload || !signature) {
    return null;
  }

  const expectedSignature = signPayload(payload);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (signatureBuffer.length !== expectedBuffer.length) {
    return null;
  }

  if (!timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return null;
  }

  const decoded = fromBase64Url(payload);
  if (!decoded) {
    return null;
  }

  try {
    const parsed = JSON.parse(decoded) as SessionUser;
    if (!parsed.userId || !parsed.email || !parsed.role || typeof parsed.exp !== 'number') {
      return null;
    }

    if (parsed.exp < Date.now()) {
      return null;
    }

    if (parsed.role !== 'user' && parsed.role !== 'admin' && parsed.role !== 'global') {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export async function setSessionCookie(user: Omit<SessionUser, 'exp'>): Promise<void> {
  const expires = Date.now() + SESSION_TTL_SECONDS * 1000;

  const token = serializeSession({
    ...user,
    exp: expires
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_TTL_SECONDS
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  return parseSession(token);
}

export async function requireSessionUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    redirect('/login');
  }

  return user;
}
