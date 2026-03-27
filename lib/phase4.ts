import 'server-only';

import { z } from 'zod';
import type { SessionUser } from '@/lib/auth';
import { query } from '@/lib/db';

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;

const blockedExtensions = new Set([
  'exe',
  'msi',
  'bat',
  'cmd',
  'com',
  'ps1',
  'sh',
  'js',
  'mjs',
  'cjs',
  'jar',
  'vbs',
  'scr'
]);

const allowedExtensions = new Set([
  'pdf',
  'doc',
  'docx',
  'txt',
  'md',
  'xls',
  'xlsx',
  'csv',
  'ppt',
  'pptx',
  'png',
  'jpg',
  'jpeg',
  'webp',
  'gif',
  'svg',
  'zip'
]);

export const uploadFileInputSchema = z.object({
  projectId: z.string().uuid(),
  fileName: z.string().trim().min(1).max(255),
  mimeType: z.string().trim().min(1).max(255),
  fileSize: z.number().int().positive().max(MAX_FILE_SIZE_BYTES),
  storageKey: z.string().trim().min(1).max(512)
});

export const deleteEntitySchema = z.object({
  projectId: z.string().uuid(),
  id: z.string().uuid()
});

export const postChatSchema = z.object({
  projectId: z.string().uuid(),
  message: z.string().trim().min(1).max(1000)
});

export type SharedFile = {
  id: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  uploadedByName: string;
  createdAt: string;
};

export type SharedFileWithStorageKey = SharedFile & {
  storageKey: string;
};

export type ChatMessage = {
  id: string;
  message: string;
  postedByName: string;
  createdAt: string;
};

export function isAllowedFile(fileName: string, mimeType: string, fileSize: number): boolean {
  if (fileSize > MAX_FILE_SIZE_BYTES) {
    return false;
  }

  const extension = fileName.split('.').pop()?.toLowerCase() ?? '';
  if (!extension || blockedExtensions.has(extension) || !allowedExtensions.has(extension)) {
    return false;
  }

  if (mimeType.toLowerCase().includes('javascript') || mimeType.toLowerCase().includes('x-msdownload')) {
    return false;
  }

  return true;
}

export function getFileValidationError(fileName: string, mimeType: string, fileSize: number): string | null {
  if (fileSize > MAX_FILE_SIZE_BYTES) {
    return 'ファイルサイズは50MB以下にしてください。';
  }

  const extension = fileName.split('.').pop()?.toLowerCase() ?? '';
  if (!extension || blockedExtensions.has(extension) || !allowedExtensions.has(extension)) {
    return '許可されていないファイル形式です。';
  }

  if (mimeType.toLowerCase().includes('javascript') || mimeType.toLowerCase().includes('x-msdownload')) {
    return '許可されていないファイル形式です。';
  }

  return null;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(1)} ${units[unitIndex]}`;
}

export async function listSharedFilesByProject(projectId: string): Promise<SharedFile[]> {
  const result = await query<SharedFile>(
    `SELECT f.id::text,
            f.file_name AS "fileName",
            f.mime_type AS "mimeType",
            f.file_size AS "fileSize",
            COALESCE(u.name, u.email) AS "uploadedByName",
            f.created_at::text AS "createdAt"
     FROM files f
     INNER JOIN users u
       ON u.id = f.uploaded_by
      AND u.deleted_at IS NULL
     WHERE f.project_id = $1
       AND f.deleted_at IS NULL
     ORDER BY f.created_at DESC`,
    [projectId]
  );

  return result.rows;
}

export async function findSharedFileForProject(
  projectId: string,
  fileId: string
): Promise<SharedFileWithStorageKey | null> {
  const result = await query<SharedFileWithStorageKey>(
    `SELECT f.id::text,
            f.file_name AS "fileName",
            f.mime_type AS "mimeType",
            f.file_size AS "fileSize",
            COALESCE(u.name, u.email) AS "uploadedByName",
            f.created_at::text AS "createdAt",
            f.storage_key AS "storageKey"
     FROM files f
     INNER JOIN users u
       ON u.id = f.uploaded_by
      AND u.deleted_at IS NULL
     WHERE f.id = $1
       AND f.project_id = $2
       AND f.deleted_at IS NULL
     LIMIT 1`,
    [fileId, projectId]
  );

  return result.rows[0] ?? null;
}

export async function createSharedFile(input: z.infer<typeof uploadFileInputSchema>, actor: SessionUser): Promise<string | null> {
  const result = await query<{ id: string }>(
    `INSERT INTO files (project_id, file_name, storage_key, mime_type, file_size, uploaded_by)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id::text`,
    [input.projectId, input.fileName, input.storageKey, input.mimeType, input.fileSize, actor.userId]
  );

  const fileId = result.rows[0]?.id ?? null;
  if (!fileId) {
    return null;
  }

  await writeAuditLog({
    actor,
    projectId: input.projectId,
    actionType: 'file_uploaded',
    targetType: 'file',
    targetId: fileId,
    metadata: {
      fileName: input.fileName,
      fileSize: input.fileSize,
      mimeType: input.mimeType
    }
  });

  return fileId;
}

export async function logicalDeleteSharedFile(
  projectId: string,
  fileId: string,
  actor: SessionUser
): Promise<{ id: string; storageKey: string } | null> {
  const result = await query<{ id: string; storageKey: string }>(
    `UPDATE files f
     SET deleted_at = NOW()
     WHERE f.id = $1
       AND f.project_id = $2
       AND f.deleted_at IS NULL
     RETURNING f.id::text, f.storage_key AS "storageKey"`,
    [fileId, projectId]
  );

  const row = result.rows[0] ?? null;
  if (!row) {
    return null;
  }

  await writeAuditLog({
    actor,
    projectId,
    actionType: 'file_deleted',
    targetType: 'file',
    targetId: row.id,
    metadata: {}
  });

  return row;
}

export async function listChatMessagesByProject(projectId: string): Promise<ChatMessage[]> {
  const result = await query<ChatMessage>(
    `SELECT cm.id::text,
            cm.message,
            COALESCE(u.name, u.email) AS "postedByName",
            cm.created_at::text AS "createdAt"
     FROM chat_messages cm
     INNER JOIN users u
       ON u.id = cm.posted_by
      AND u.deleted_at IS NULL
     WHERE cm.project_id = $1
       AND cm.deleted_at IS NULL
     ORDER BY cm.created_at DESC`,
    [projectId]
  );

  return result.rows;
}

export async function createChatMessage(
  input: z.infer<typeof postChatSchema>,
  actor: SessionUser
): Promise<string | null> {
  const result = await query<{ id: string }>(
    `INSERT INTO chat_messages (project_id, message, posted_by)
     VALUES ($1, $2, $3)
     RETURNING id::text`,
    [input.projectId, input.message, actor.userId]
  );

  const messageId = result.rows[0]?.id ?? null;
  if (!messageId) {
    return null;
  }

  await writeAuditLog({
    actor,
    projectId: input.projectId,
    actionType: 'chat_posted',
    targetType: 'chat_message',
    targetId: messageId,
    metadata: {}
  });

  return messageId;
}

export async function logicalDeleteChatMessage(
  projectId: string,
  messageId: string,
  actor: SessionUser
): Promise<string | null> {
  const result = await query<{ id: string }>(
    `UPDATE chat_messages cm
     SET deleted_at = NOW()
     WHERE cm.id = $1
       AND cm.project_id = $2
       AND cm.deleted_at IS NULL
     RETURNING cm.id::text`,
    [messageId, projectId]
  );

  const id = result.rows[0]?.id ?? null;
  if (!id) {
    return null;
  }

  await writeAuditLog({
    actor,
    projectId,
    actionType: 'chat_deleted',
    targetType: 'chat_message',
    targetId: id,
    metadata: {}
  });

  return id;
}

async function writeAuditLog({
  actor,
  projectId,
  actionType,
  targetType,
  targetId,
  metadata
}: {
  actor: SessionUser;
  projectId: string;
  actionType: 'file_uploaded' | 'file_deleted' | 'chat_posted' | 'chat_deleted';
  targetType: 'file' | 'chat_message';
  targetId: string;
  metadata: Record<string, unknown>;
}): Promise<void> {
  await query(
    `INSERT INTO audit_logs (
       actor_user_id,
       actor_email,
       actor_role,
       project_id,
       action_type,
       target_type,
       target_id,
       metadata_json
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)`,
    [
      actor.userId,
      actor.email,
      actor.role,
      projectId,
      actionType,
      targetType,
      targetId,
      JSON.stringify(metadata)
    ]
  );
}
