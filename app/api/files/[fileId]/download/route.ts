import { z } from 'zod';
import { findProjectForUser } from '@/lib/access';
import { requireSessionUser } from '@/lib/auth';
import { findSharedFileForProject } from '@/lib/phase4';

export const runtime = 'nodejs';

const paramsSchema = z.object({ fileId: z.string().uuid() });
const querySchema = z.object({ projectId: z.string().uuid() });

export async function GET(
  request: Request,
  { params }: { params: Promise<{ fileId: string }> }
) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    return new Response('Storage configuration missing', { status: 500 });
  }

  const sessionUser = await requireSessionUser();

  const parsedParams = paramsSchema.safeParse(await params);
  const url = new URL(request.url);
  const parsedQuery = querySchema.safeParse({ projectId: url.searchParams.get('projectId') ?? '' });

  if (!parsedParams.success || !parsedQuery.success) {
    return new Response('Not Found', { status: 404 });
  }

  const project = await findProjectForUser(parsedQuery.data.projectId, sessionUser.userId, sessionUser.role);
  if (!project) {
    return new Response('Forbidden', { status: 403 });
  }

  const file = await findSharedFileForProject(project.id, parsedParams.data.fileId);
  if (!file) {
    return new Response('Not Found', { status: 404 });
  }

  const blobResponse = await fetch(file.storageKey, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!blobResponse.ok || !blobResponse.body) {
    return new Response('Download failed', { status: 502 });
  }

  return new Response(blobResponse.body, {
    headers: {
      'content-type': file.mimeType,
      'content-disposition': `attachment; filename*=UTF-8''${encodeURIComponent(file.fileName)}`,
      'cache-control': 'private, no-store'
    }
  });
}
