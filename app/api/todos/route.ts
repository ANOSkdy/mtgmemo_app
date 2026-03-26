import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { hasDatabaseUrl, query } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20)
});

const createTodoSchema = z.object({
  title: z.string().trim().min(1).max(280)
});

type TodoRow = {
  id: number;
  title: string;
  completed: boolean;
  created_at: string;
};

export async function GET(request: NextRequest) {
  if (!hasDatabaseUrl()) {
    return NextResponse.json(
      { ok: false, error: 'MISSING_DATABASE_URL' },
      { status: 503 }
    );
  }

  const parsed = listQuerySchema.safeParse({
    limit: request.nextUrl.searchParams.get('limit') ?? undefined
  });

  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'INVALID_QUERY' }, { status: 400 });
  }

  try {
    const result = await query<TodoRow>(
      `SELECT id, title, completed, created_at
       FROM todos
       ORDER BY created_at DESC
       LIMIT $1`,
      [parsed.data.limit]
    );

    return NextResponse.json({ ok: true, data: result.rows });
  } catch {
    return NextResponse.json({ ok: false, error: 'DB_QUERY_FAILED' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!hasDatabaseUrl()) {
    return NextResponse.json(
      { ok: false, error: 'MISSING_DATABASE_URL' },
      { status: 503 }
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'INVALID_JSON' }, { status: 400 });
  }

  const parsed = createTodoSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'INVALID_BODY' }, { status: 400 });
  }

  try {
    const result = await query<TodoRow>(
      `INSERT INTO todos (title)
       VALUES ($1)
       RETURNING id, title, completed, created_at`,
      [parsed.data.title]
    );

    return NextResponse.json({ ok: true, data: result.rows[0] }, { status: 201 });
  } catch {
    return NextResponse.json({ ok: false, error: 'DB_INSERT_FAILED' }, { status: 500 });
  }
}
