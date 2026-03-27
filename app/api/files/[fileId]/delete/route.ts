import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { findProjectForUser } from '@/lib/access';
import { requireSessionUser } from '@/lib/auth';
import { deleteEntitySchema, logicalDeleteSharedFile } from '@/lib/phase4';

export const runtime = 'nodejs';

const paramsSchema = z.object({ fileId: z.string().uuid() });

export async function POST(
  request: Request,
  { params }: { params: Promise<{ fileId: string }> }
) {
  const sessionUser = await requireSessionUser();
  if (sessionUser.role !== 'global') {
    return new Response('Forbidden', { status: 403 });
  }

  const parsedParams = paramsSchema.safeParse(await params);
  const formData = await request.formData();

  const parsedInput = deleteEntitySchema.safeParse({
    id: parsedParams.success ? parsedParams.data.fileId : '',
    projectId: typeof formData.get('projectId') === 'string' ? formData.get('projectId') : ''
  });

  if (!parsedInput.success) {
    return new Response('Not Found', { status: 404 });
  }

  const project = await findProjectForUser(parsedInput.data.projectId, sessionUser.userId, sessionUser.role);
  if (!project) {
    return new Response('Forbidden', { status: 403 });
  }

  await logicalDeleteSharedFile(project.id, parsedInput.data.id, sessionUser);

  revalidatePath(`/project/${project.id}/files`);

  return NextResponse.redirect(new URL(`/project/${project.id}/files`, request.url));
}
