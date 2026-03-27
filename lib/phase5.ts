import 'server-only';

import { z } from 'zod';
import { query } from '@/lib/db';
import type { SessionUser } from '@/lib/auth';
import { writeAuditLog } from '@/lib/phase3';

export const userRoles = ['user', 'admin', 'global'] as const;
export const projectStatuses = ['planned', 'active', 'completed', 'paused'] as const;

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .optional()
  .transform((value) => (value ? value : undefined));

export const accountCreateSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(255),
  role: z.enum(userRoles),
  isActive: z.boolean(),
  password: z.string().min(8).max(200),
  projectIds: z.array(z.string().uuid()).default([])
});

export const accountUpdateSchema = z.object({
  userId: z.string().uuid(),
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(255),
  role: z.enum(userRoles),
  isActive: z.boolean(),
  password: z.string().min(8).max(200).optional(),
  projectIds: z.array(z.string().uuid()).default([])
});

export const projectCreateSchema = z
  .object({
    projectName: z.string().trim().min(1).max(200),
    clientName: z.string().trim().min(1).max(200),
    description: z.string().trim().max(5000).optional(),
    startDate: dateSchema,
    endDate: dateSchema,
    status: z.enum(projectStatuses),
    memberIds: z.array(z.string().uuid()).default([])
  })
  .refine(
    (input) => !input.startDate || !input.endDate || input.startDate <= input.endDate,
    '開始日は終了日以前に設定してください'
  );

export const projectUpdateSchema = projectCreateSchema.extend({
  projectId: z.string().uuid()
});

export type AccountListItem = {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin' | 'global';
  isActive: boolean;
  deletedAt: string | null;
};

export type ProjectOption = {
  id: string;
  name: string;
};

export type AccountEditData = AccountListItem & {
  projectIds: string[];
};

export type ProjectListItem = {
  id: string;
  projectName: string;
  clientName: string;
  status: 'planned' | 'active' | 'completed' | 'paused';
  startDate: string | null;
  endDate: string | null;
  deletedAt: string | null;
};

export type UserOption = {
  id: string;
  name: string;
  email: string;
};

export type ProjectEditData = ProjectListItem & {
  description: string;
  memberIds: string[];
};

export async function listAccounts(): Promise<AccountListItem[]> {
  const result = await query<AccountListItem>(
    `SELECT id::text,
            name,
            email,
            role,
            is_active AS "isActive",
            deleted_at::text AS "deletedAt"
     FROM users
     ORDER BY deleted_at IS NULL DESC, created_at DESC`
  );

  return result.rows;
}

export async function listProjectsForMembership(): Promise<ProjectOption[]> {
  const result = await query<ProjectOption>(
    `SELECT id::text, project_name AS name
     FROM projects
     WHERE deleted_at IS NULL
     ORDER BY project_name ASC`
  );

  return result.rows;
}

export async function listUsersForMembership(): Promise<UserOption[]> {
  const result = await query<UserOption>(
    `SELECT id::text, name, email
     FROM users
     WHERE deleted_at IS NULL
       AND is_active = TRUE
     ORDER BY name ASC, email ASC`
  );

  return result.rows;
}

async function listActiveProjectIdsForUser(userId: string): Promise<string[]> {
  const result = await query<{ projectId: string }>(
    `SELECT project_id::text AS "projectId"
     FROM project_members
     WHERE user_id = $1
       AND deleted_at IS NULL`,
    [userId]
  );

  return result.rows.map((row) => row.projectId);
}

async function listActiveMemberIdsForProject(projectId: string): Promise<string[]> {
  const result = await query<{ userId: string }>(
    `SELECT user_id::text AS "userId"
     FROM project_members
     WHERE project_id = $1
       AND deleted_at IS NULL`,
    [projectId]
  );

  return result.rows.map((row) => row.userId);
}

export async function findAccountForEdit(userId: string): Promise<AccountEditData | null> {
  const userResult = await query<AccountListItem>(
    `SELECT id::text,
            name,
            email,
            role,
            is_active AS "isActive",
            deleted_at::text AS "deletedAt"
     FROM users
     WHERE id = $1
     LIMIT 1`,
    [userId]
  );

  const row = userResult.rows[0];
  if (!row) {
    return null;
  }

  const projectIds = await listActiveProjectIdsForUser(userId);
  return { ...row, projectIds };
}

export async function findProjectForEdit(projectId: string): Promise<ProjectEditData | null> {
  const projectResult = await query<ProjectListItem & { description: string | null }>(
    `SELECT id::text,
            project_name AS "projectName",
            client_name AS "clientName",
            description,
            start_date::text AS "startDate",
            end_date::text AS "endDate",
            status,
            deleted_at::text AS "deletedAt"
     FROM projects
     WHERE id = $1
     LIMIT 1`,
    [projectId]
  );

  const row = projectResult.rows[0];
  if (!row) {
    return null;
  }

  const memberIds = await listActiveMemberIdsForProject(projectId);
  return {
    ...row,
    description: row.description ?? '',
    memberIds
  };
}

async function syncUserProjectMemberships(userId: string, projectIds: string[]): Promise<void> {
  if (projectIds.length === 0) {
    await query(
      `UPDATE project_members
       SET deleted_at = NOW()
       WHERE user_id = $1
         AND deleted_at IS NULL`,
      [userId]
    );
    return;
  }

  await query(
    `UPDATE project_members
     SET deleted_at = NOW()
     WHERE user_id = $1
       AND deleted_at IS NULL
       AND project_id <> ALL($2::uuid[])`,
    [userId, projectIds]
  );

  for (const projectId of projectIds) {
    await query(
      `UPDATE project_members
       SET deleted_at = NULL,
           member_type = 'member'
       WHERE user_id = $1
         AND project_id = $2
         AND deleted_at IS NOT NULL`,
      [userId, projectId]
    );

    await query(
      `INSERT INTO project_members (project_id, user_id, member_type)
       SELECT $1, $2, 'member'
       WHERE NOT EXISTS (
         SELECT 1
         FROM project_members
         WHERE project_id = $1
           AND user_id = $2
           AND deleted_at IS NULL
       )`,
      [projectId, userId]
    );
  }
}

async function syncProjectMemberships(projectId: string, memberIds: string[]): Promise<void> {
  if (memberIds.length === 0) {
    await query(
      `UPDATE project_members
       SET deleted_at = NOW()
       WHERE project_id = $1
         AND deleted_at IS NULL`,
      [projectId]
    );
    return;
  }

  await query(
    `UPDATE project_members
     SET deleted_at = NOW()
     WHERE project_id = $1
       AND deleted_at IS NULL
       AND user_id <> ALL($2::uuid[])`,
    [projectId, memberIds]
  );

  for (const userId of memberIds) {
    await query(
      `UPDATE project_members
       SET deleted_at = NULL,
           member_type = 'member'
       WHERE project_id = $1
         AND user_id = $2
         AND deleted_at IS NOT NULL`,
      [projectId, userId]
    );

    await query(
      `INSERT INTO project_members (project_id, user_id, member_type)
       SELECT $1, $2, 'member'
       WHERE NOT EXISTS (
         SELECT 1
         FROM project_members
         WHERE project_id = $1
           AND user_id = $2
           AND deleted_at IS NULL
       )`,
      [projectId, userId]
    );
  }
}

export async function createAccount(input: z.infer<typeof accountCreateSchema>, actor: SessionUser): Promise<string | null> {
  const existing = await query<{ id: string }>(
    `SELECT id::text
     FROM users
     WHERE lower(email) = lower($1)
     LIMIT 1`,
    [input.email]
  );

  if (existing.rows[0]) {
    return null;
  }

  const created = await query<{ id: string }>(
    `INSERT INTO users (name, email, password_hash, role, is_active)
     VALUES ($1, $2, crypt($3, gen_salt('bf')), $4, $5)
     RETURNING id::text`,
    [input.name, input.email, input.password, input.role, input.isActive]
  );

  const userId = created.rows[0]?.id;
  if (!userId) {
    return null;
  }

  await syncUserProjectMemberships(userId, input.projectIds);

  await writeAuditLog({
    actor,
    projectId: null,
    actionType: 'account_created',
    targetType: 'user',
    targetId: userId,
    metadata: {
      email: input.email,
      role: input.role,
      isActive: input.isActive,
      projectIds: input.projectIds
    }
  });

  return userId;
}

export async function updateAccount(input: z.infer<typeof accountUpdateSchema>, actor: SessionUser): Promise<boolean> {
  const existing = await query<{ id: string }>(
    `SELECT id::text
     FROM users
     WHERE lower(email) = lower($1)
       AND id <> $2
     LIMIT 1`,
    [input.email, input.userId]
  );

  if (existing.rows[0]) {
    return false;
  }

  const updateResult = input.password
    ? await query<{ id: string }>(
        `UPDATE users
         SET name = $2,
             email = $3,
             role = $4,
             is_active = $5,
             password_hash = crypt($6, gen_salt('bf')),
             updated_at = NOW()
         WHERE id = $1
           AND deleted_at IS NULL
         RETURNING id::text`,
        [input.userId, input.name, input.email, input.role, input.isActive, input.password]
      )
    : await query<{ id: string }>(
        `UPDATE users
         SET name = $2,
             email = $3,
             role = $4,
             is_active = $5,
             updated_at = NOW()
         WHERE id = $1
           AND deleted_at IS NULL
         RETURNING id::text`,
        [input.userId, input.name, input.email, input.role, input.isActive]
      );

  if (!updateResult.rows[0]) {
    return false;
  }

  await syncUserProjectMemberships(input.userId, input.projectIds);

  await writeAuditLog({
    actor,
    projectId: null,
    actionType: 'account_updated',
    targetType: 'user',
    targetId: input.userId,
    metadata: {
      email: input.email,
      role: input.role,
      isActive: input.isActive,
      projectIds: input.projectIds,
      passwordChanged: Boolean(input.password)
    }
  });

  return true;
}

export async function deleteAccount(userId: string, actor: SessionUser): Promise<boolean> {
  const deleted = await query<{ id: string }>(
    `UPDATE users
     SET is_active = FALSE,
         deleted_at = NOW(),
         updated_at = NOW()
     WHERE id = $1
       AND deleted_at IS NULL
     RETURNING id::text`,
    [userId]
  );

  if (!deleted.rows[0]) {
    return false;
  }

  await query(
    `UPDATE project_members
     SET deleted_at = NOW()
     WHERE user_id = $1
       AND deleted_at IS NULL`,
    [userId]
  );

  await writeAuditLog({
    actor,
    projectId: null,
    actionType: 'account_deleted',
    targetType: 'user',
    targetId: userId,
    metadata: {}
  });

  return true;
}

export async function listProjects(): Promise<ProjectListItem[]> {
  const result = await query<ProjectListItem>(
    `SELECT id::text,
            project_name AS "projectName",
            client_name AS "clientName",
            status,
            start_date::text AS "startDate",
            end_date::text AS "endDate",
            deleted_at::text AS "deletedAt"
     FROM projects
     ORDER BY deleted_at IS NULL DESC, created_at DESC`
  );

  return result.rows;
}

export async function createProject(input: z.infer<typeof projectCreateSchema>, actor: SessionUser): Promise<string | null> {
  const created = await query<{ id: string }>(
    `INSERT INTO projects (project_name, client_name, description, start_date, end_date, status)
     VALUES ($1, $2, $3, $4::date, $5::date, $6)
     RETURNING id::text`,
    [
      input.projectName,
      input.clientName,
      input.description ?? null,
      input.startDate ?? null,
      input.endDate ?? null,
      input.status
    ]
  );

  const projectId = created.rows[0]?.id;
  if (!projectId) {
    return null;
  }

  await syncProjectMemberships(projectId, input.memberIds);

  await writeAuditLog({
    actor,
    projectId,
    actionType: 'project_created',
    targetType: 'project',
    targetId: projectId,
    metadata: {
      projectName: input.projectName,
      clientName: input.clientName,
      status: input.status,
      memberIds: input.memberIds
    }
  });

  await writeAuditLog({
    actor,
    projectId,
    actionType: 'project_members_updated',
    targetType: 'project',
    targetId: projectId,
    metadata: { memberIds: input.memberIds }
  });

  return projectId;
}

export async function updateProject(input: z.infer<typeof projectUpdateSchema>, actor: SessionUser): Promise<boolean> {
  const updated = await query<{ id: string }>(
    `UPDATE projects
     SET project_name = $2,
         client_name = $3,
         description = $4,
         start_date = $5::date,
         end_date = $6::date,
         status = $7,
         updated_at = NOW()
     WHERE id = $1
       AND deleted_at IS NULL
     RETURNING id::text`,
    [
      input.projectId,
      input.projectName,
      input.clientName,
      input.description ?? null,
      input.startDate ?? null,
      input.endDate ?? null,
      input.status
    ]
  );

  if (!updated.rows[0]) {
    return false;
  }

  await syncProjectMemberships(input.projectId, input.memberIds);

  await writeAuditLog({
    actor,
    projectId: input.projectId,
    actionType: 'project_updated',
    targetType: 'project',
    targetId: input.projectId,
    metadata: {
      projectName: input.projectName,
      clientName: input.clientName,
      status: input.status
    }
  });

  await writeAuditLog({
    actor,
    projectId: input.projectId,
    actionType: 'project_members_updated',
    targetType: 'project',
    targetId: input.projectId,
    metadata: { memberIds: input.memberIds }
  });

  return true;
}

export async function deleteProject(projectId: string, actor: SessionUser): Promise<boolean> {
  const deleted = await query<{ id: string }>(
    `UPDATE projects
     SET deleted_at = NOW(),
         updated_at = NOW()
     WHERE id = $1
       AND deleted_at IS NULL
     RETURNING id::text`,
    [projectId]
  );

  if (!deleted.rows[0]) {
    return false;
  }

  await query(
    `UPDATE project_members
     SET deleted_at = NOW()
     WHERE project_id = $1
       AND deleted_at IS NULL`,
    [projectId]
  );

  await writeAuditLog({
    actor,
    projectId,
    actionType: 'project_deleted',
    targetType: 'project',
    targetId: projectId,
    metadata: {}
  });

  return true;
}
