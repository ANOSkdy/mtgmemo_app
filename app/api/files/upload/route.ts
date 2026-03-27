import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { findProjectForUser } from '@/lib/access';
import { requireSessionUser } from '@/lib/auth';
import {
  createSharedFile,
  getFileValidationError,
  isAllowedFile,
  uploadFileInputSchema
} from '@/lib/phase4';

export const runtime = 'nodejs';

function sanitizeFileName(fileName: string): string {
  return fileName
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 180);
}

export async function POST(request: Request) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    return NextResponse.json({ error: 'ストレージ設定が不足しています。' }, { status: 500 });
  }

  const sessionUser = await requireSessionUser();
  const formData = await request.formData();

  const projectId = typeof formData.get('projectId') === 'string' ? String(formData.get('projectId')) : '';
  const file = formData.get('file');

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'ファイルを指定してください。' }, { status: 400 });
  }

  const project = await findProjectForUser(projectId, sessionUser.userId, sessionUser.role);
  if (!project) {
    return NextResponse.json({ error: 'アクセス権限がありません。' }, { status: 403 });
  }

  const mimeType = file.type || 'application/octet-stream';
  if (!isAllowedFile(file.name, mimeType, file.size)) {
    const error = getFileValidationError(file.name, mimeType, file.size);
    return NextResponse.json({ error: error ?? 'アップロードできません。' }, { status: 400 });
  }

  const safeName = sanitizeFileName(file.name);
  const storagePath = `projects/${project.id}/${randomUUID()}-${safeName}`;

  const uploadResponse = await fetch(`https://blob.vercel-storage.com/${storagePath}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'x-add-random-suffix': '0',
      'x-content-type': mimeType,
      'x-access': 'private'
    },
    body: file
  });

  if (!uploadResponse.ok) {
    return NextResponse.json({ error: 'アップロードできません。' }, { status: 502 });
  }

  const uploadResult = (await uploadResponse.json()) as { url?: string };
  if (!uploadResult.url) {
    return NextResponse.json({ error: 'アップロードできません。' }, { status: 502 });
  }

  const parsed = uploadFileInputSchema.safeParse({
    projectId: project.id,
    fileName: file.name,
    mimeType,
    fileSize: file.size,
    storageKey: uploadResult.url
  });

  if (!parsed.success) {
    return NextResponse.json({ error: 'アップロードできません。' }, { status: 400 });
  }

  await createSharedFile(parsed.data, sessionUser);

  return NextResponse.json({ ok: true });
}
