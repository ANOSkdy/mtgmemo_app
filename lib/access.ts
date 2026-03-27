import 'server-only';

import { query } from '@/lib/db';
import type { AppRole } from '@/lib/auth';

type UserRow = {
  id: string;
  email: string;
  role: AppRole;
};

type ProjectRow = {
  id: string;
  name: string;
};

export async function verifyUserCredentials(email: string, password: string): Promise<UserRow | null> {
  const result = await query<UserRow>(
    `SELECT id::text, email, role
     FROM users
     WHERE lower(email) = lower($1)
       AND password_hash = crypt($2, password_hash)
       AND deleted_at IS NULL
     LIMIT 1`,
    [email, password]
  );

  return result.rows[0] ?? null;
}

export async function listProjectsForUser(userId: string, role: AppRole): Promise<ProjectRow[]> {
  if (role === 'global') {
    const result = await query<ProjectRow>(
      `SELECT id::text, project_name AS name
       FROM projects
       WHERE deleted_at IS NULL
       ORDER BY project_name ASC`
    );

    return result.rows;
  }

  const result = await query<ProjectRow>(
    `SELECT p.id::text, p.project_name AS name
     FROM projects p
     INNER JOIN project_members pm
       ON pm.project_id = p.id
     WHERE p.deleted_at IS NULL
       AND pm.deleted_at IS NULL
       AND pm.user_id = $1
     ORDER BY p.project_name ASC`,
    [userId]
  );

  return result.rows;
}

export async function findProjectForUser(
  projectId: string,
  userId: string,
  role: AppRole
): Promise<ProjectRow | null> {
  if (role === 'global') {
    const result = await query<ProjectRow>(
      `SELECT id::text, project_name AS name
       FROM projects
       WHERE id = $1
         AND deleted_at IS NULL
       LIMIT 1`,
      [projectId]
    );

    return result.rows[0] ?? null;
  }

  const result = await query<ProjectRow>(
    `SELECT p.id::text, p.project_name AS name
     FROM projects p
     INNER JOIN project_members pm
       ON pm.project_id = p.id
     WHERE p.id = $1
       AND p.deleted_at IS NULL
       AND pm.deleted_at IS NULL
       AND pm.user_id = $2
     LIMIT 1`,
    [projectId, userId]
  );

  return result.rows[0] ?? null;
}
