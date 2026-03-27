import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { findProjectForUser } from '@/lib/access';
import { requireSessionUser } from '@/lib/auth';
import { deleteEntitySchema, logicalDeleteChatMessage } from '@/lib/phase4';

export const runtime = 'nodejs';

const paramsSchema = z.object({ messageId: z.string().uuid() });

export async function POST(
  request: Request,
  { params }: { params: Promise<{ messageId: string }> }
) {
  const sessionUser = await requireSessionUser();
  if (sessionUser.role !== 'global') {
    return new Response('Forbidden', { status: 403 });
  }

  const parsedParams = paramsSchema.safeParse(await params);
  const formData = await request.formData();

  const parsedInput = deleteEntitySchema.safeParse({
    id: parsedParams.success ? parsedParams.data.messageId : '',
    projectId: typeof formData.get('projectId') === 'string' ? formData.get('projectId') : ''
  });

  if (!parsedInput.success) {
    return new Response('Not Found', { status: 404 });
  }

  const project = await findProjectForUser(parsedInput.data.projectId, sessionUser.userId, sessionUser.role);
  if (!project) {
    return new Response('Forbidden', { status: 403 });
  }

  await logicalDeleteChatMessage(project.id, parsedInput.data.id, sessionUser);

  revalidatePath(`/project/${project.id}/chat`);

  return NextResponse.redirect(new URL(`/project/${project.id}/chat`, request.url));
}
