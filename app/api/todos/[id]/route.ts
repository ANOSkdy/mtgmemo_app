import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { hasDatabaseUrl, query } from '@/lib/db';

export const runtime = 'nodejs';

const idSchema = z.coerce.number().int().positive();

const patchSchema = z
  .object({
    title: z.string().trim().min(1).max(280).optional(),
    completed: z.boolean().optional()
  })
  .refine((value) => value.title !== undefined || value.completed !== undefined, {
    message: 'At least one field is required.'
  });

type TodoRow = {
  id: number;
  title: string;
  completed: boolean;
  created_at: string;
};

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!hasDatabaseUrl()) {
    return NextResponse.json(
      { ok: false, error: 'MISSING_DATABASE_URL' },
      { status: 503 }
    );
  }

  const { id } = await params;
  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) {
    return NextResponse.json({ ok: false, error: 'INVALID_ID' }, { status: 400 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'INVALID_JSON' }, { status: 400 });
  }

  const parsedBody = patchSchema.safeParse(payload);
  if (!parsedBody.success) {
    return NextResponse.json({ ok: false, error: 'INVALID_BODY' }, { status: 400 });
  }

  const fields: string[] = [];
  const values: unknown[] = [];

  if (parsedBody.data.title !== undefined) {
    values.push(parsedBody.data.title);
    fields.push(`title = $${values.length}`);
  }

  if (parsedBody.data.completed !== undefined) {
    values.push(parsedBody.data.completed);
    fields.push(`completed = $${values.length}`);
  }

  values.push(parsedId.data);

  try {
    const result = await query<TodoRow>(
      `UPDATE todos
       SET ${fields.join(', ')}
       WHERE id = $${values.length}
       RETURNING id, title, completed, created_at`,
      values
    );

    if ((result.rowCount ?? 0) === 0) {
      return NextResponse.json({ ok: false, error: 'NOT_FOUND' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, data: result.rows[0] });
  } catch {
    return NextResponse.json({ ok: false, error: 'DB_UPDATE_FAILED' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!hasDatabaseUrl()) {
    return NextResponse.json(
      { ok: false, error: 'MISSING_DATABASE_URL' },
      { status: 503 }
    );
  }

  const { id } = await params;
  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) {
    return NextResponse.json({ ok: false, error: 'INVALID_ID' }, { status: 400 });
  }

  try {
    const result = await query(
      `DELETE FROM todos
       WHERE id = $1`,
      [parsedId.data]
    );

    if ((result.rowCount ?? 0) === 0) {
      return NextResponse.json({ ok: false, error: 'NOT_FOUND' }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: 'DB_DELETE_FAILED' }, { status: 500 });
  }
}
