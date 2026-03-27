import { NextResponse } from 'next/server';
import { findProjectForUser } from '@/lib/access';
import { requireSessionUser } from '@/lib/auth';
import { createChatMessage, postChatSchema } from '@/lib/phase4';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const sessionUser = await requireSessionUser();
  const formData = await request.formData();

  const parsed = postChatSchema.safeParse({
    projectId: typeof formData.get('projectId') === 'string' ? formData.get('projectId') : '',
    message: typeof formData.get('message') === 'string' ? formData.get('message') : ''
  });

  if (!parsed.success) {
    return NextResponse.json({ error: 'メッセージを確認してください。' }, { status: 400 });
  }

  const project = await findProjectForUser(parsed.data.projectId, sessionUser.userId, sessionUser.role);
  if (!project) {
    return NextResponse.json({ error: 'アクセス権限がありません。' }, { status: 403 });
  }

  await createChatMessage(
    {
      projectId: project.id,
      message: parsed.data.message
    },
    sessionUser
  );

  return NextResponse.json({ ok: true });
}
