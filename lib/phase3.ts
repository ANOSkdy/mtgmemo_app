import 'server-only';

import { z } from 'zod';
import { query } from '@/lib/db';
import type { SessionUser } from '@/lib/auth';
import type { TaskPriority, TaskStatus } from '@/lib/phase2';

export const taskStatuses = ['not_started', 'in_progress', 'done'] as const satisfies readonly TaskStatus[];
export const taskPriorities = ['high', 'medium', 'low'] as const satisfies readonly TaskPriority[];

export const meetingNoteFormSchema = z.object({
  projectId: z.string().uuid(),
  title: z.string().trim().min(1, 'タイトルは必須です').max(200, 'タイトルが長すぎます'),
  meetingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '開催日は必須です'),
  content: z.string().trim().min(1, '内容は必須です')
});

export const taskFormSchema = z.object({
  projectId: z.string().uuid(),
  title: z.string().trim().min(1, 'タイトルは必須です').max(200, 'タイトルが長すぎます'),
  description: z.string().trim().max(5000, '詳細が長すぎます').optional(),
  status: z.enum(taskStatuses),
  priority: z.enum(taskPriorities),
  assigneeUserId: z.string().uuid().optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  relatedMeetingNoteId: z.string().uuid().optional()
});

type ProjectOption = {
  id: string;
  name: string;
};

export type UserOption = {
  id: string;
  name: string;
  email: string;
};

export type MeetingNoteOption = {
  id: string;
  projectId: string;
  projectName: string;
  title: string;
};

export type MeetingNoteForEdit = {
  id: string;
  projectId: string;
  title: string;
  meetingDate: string;
  content: string;
};

export type TaskForEdit = {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeUserId: string | null;
  dueDate: string | null;
  relatedMeetingNoteId: string | null;
};

async function ensureProjectExists(projectId: string): Promise<boolean> {
  const result = await query<{ id: string }>(
    `SELECT id::text
     FROM projects
     WHERE id = $1
       AND deleted_at IS NULL
     LIMIT 1`,
    [projectId]
  );

  return Boolean(result.rows[0]);
}

export async function listProjectOptions(): Promise<ProjectOption[]> {
  const result = await query<ProjectOption>(
    `SELECT id::text, project_name AS name
     FROM projects
     WHERE deleted_at IS NULL
     ORDER BY project_name ASC`
  );

  return result.rows;
}

export async function listAssignableUsers(): Promise<UserOption[]> {
  const result = await query<UserOption>(
    `SELECT id::text, name, email
     FROM users
     WHERE is_active = TRUE
       AND deleted_at IS NULL
     ORDER BY name ASC, email ASC`
  );

  return result.rows;
}

export async function listMeetingNoteOptions(): Promise<MeetingNoteOption[]> {
  const result = await query<MeetingNoteOption>(
    `SELECT mn.id::text,
            mn.project_id::text AS "projectId",
            p.project_name AS "projectName",
            mn.title
     FROM meeting_notes mn
     INNER JOIN projects p
       ON p.id = mn.project_id
      AND p.deleted_at IS NULL
     WHERE mn.deleted_at IS NULL
     ORDER BY p.project_name ASC, mn.meeting_date DESC NULLS LAST, mn.updated_at DESC`
  );

  return result.rows;
}

export async function findMeetingNoteForEdit(meetingNoteId: string): Promise<MeetingNoteForEdit | null> {
  const result = await query<MeetingNoteForEdit>(
    `SELECT mn.id::text,
            mn.project_id::text AS "projectId",
            mn.title,
            COALESCE(mn.meeting_date::text, '') AS "meetingDate",
            mn.content
     FROM meeting_notes mn
     INNER JOIN projects p
       ON p.id = mn.project_id
      AND p.deleted_at IS NULL
     WHERE mn.id = $1
       AND mn.deleted_at IS NULL
     LIMIT 1`,
    [meetingNoteId]
  );

  return result.rows[0] ?? null;
}

export async function findTaskForEdit(taskId: string): Promise<TaskForEdit | null> {
  const result = await query<TaskForEdit>(
    `SELECT t.id::text,
            t.project_id::text AS "projectId",
            t.title,
            t.description,
            t.status,
            t.priority,
            t.assignee_user_id::text AS "assigneeUserId",
            t.due_date::text AS "dueDate",
            t.related_meeting_note_id::text AS "relatedMeetingNoteId"
     FROM tasks t
     INNER JOIN projects p
       ON p.id = t.project_id
      AND p.deleted_at IS NULL
     WHERE t.id = $1
       AND t.deleted_at IS NULL
     LIMIT 1`,
    [taskId]
  );

  const row = result.rows[0];
  if (!row) {
    return null;
  }

  return {
    ...row,
    description: row.description ?? ''
  };
}

export async function writeAuditLog({
  actor,
  projectId,
  actionType,
  targetType,
  targetId,
  metadata
}: {
  actor: SessionUser;
  projectId?: string | null;
  actionType: string;
  targetType: string;
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
      projectId ?? null,
      actionType,
      targetType,
      targetId,
      JSON.stringify(metadata)
    ]
  );
}

export async function createMeetingNote(input: z.infer<typeof meetingNoteFormSchema>, actor: SessionUser) {
  if (!(await ensureProjectExists(input.projectId))) {
    return null;
  }

  const result = await query<{ id: string }>(
    `INSERT INTO meeting_notes (project_id, title, meeting_date, content, created_by, updated_by)
     VALUES ($1, $2, $3::date, $4, $5, $5)
     RETURNING id::text`,
    [input.projectId, input.title, input.meetingDate, input.content, actor.userId]
  );

  const noteId = result.rows[0]?.id;
  if (!noteId) {
    return null;
  }

  await writeAuditLog({
    actor,
    projectId: input.projectId,
    actionType: 'meeting_note_created',
    targetType: 'meeting_note',
    targetId: noteId,
    metadata: { title: input.title, meetingDate: input.meetingDate }
  });

  return noteId;
}

export async function updateMeetingNote(
  meetingNoteId: string,
  input: z.infer<typeof meetingNoteFormSchema>,
  actor: SessionUser
): Promise<{ id: string; projectId: string } | null> {
  const result = await query<{ id: string; projectId: string }>(
    `UPDATE meeting_notes mn
     SET project_id = $2,
         title = $3,
         meeting_date = $4::date,
         content = $5,
         updated_by = $6,
         updated_at = NOW()
     WHERE mn.id = $1
       AND mn.deleted_at IS NULL
       AND EXISTS (
         SELECT 1
         FROM projects p
         WHERE p.id = $2
           AND p.deleted_at IS NULL
       )
     RETURNING mn.id::text, mn.project_id::text AS "projectId"`,
    [meetingNoteId, input.projectId, input.title, input.meetingDate, input.content, actor.userId]
  );

  const row = result.rows[0] ?? null;
  if (!row) {
    return null;
  }

  await writeAuditLog({
    actor,
    projectId: row.projectId,
    actionType: 'meeting_note_updated',
    targetType: 'meeting_note',
    targetId: row.id,
    metadata: { title: input.title, meetingDate: input.meetingDate }
  });

  return row;
}

export async function deleteMeetingNote(meetingNoteId: string, actor: SessionUser): Promise<{ id: string; projectId: string } | null> {
  const result = await query<{ id: string; projectId: string }>(
    `UPDATE meeting_notes mn
     SET deleted_at = NOW(),
         updated_by = $2,
         updated_at = NOW()
     WHERE mn.id = $1
       AND mn.deleted_at IS NULL
     RETURNING mn.id::text, mn.project_id::text AS "projectId"`,
    [meetingNoteId, actor.userId]
  );

  const row = result.rows[0] ?? null;
  if (!row) {
    return null;
  }

  await writeAuditLog({
    actor,
    projectId: row.projectId,
    actionType: 'meeting_note_deleted',
    targetType: 'meeting_note',
    targetId: row.id,
    metadata: {}
  });

  return row;
}

export async function createTask(input: z.infer<typeof taskFormSchema>, actor: SessionUser): Promise<string | null> {
  if (!(await ensureProjectExists(input.projectId))) {
    return null;
  }

  if (input.assigneeUserId) {
    const assigneeCheck = await query<{ id: string }>(
      `SELECT id::text
       FROM users
       WHERE id = $1
         AND is_active = TRUE
         AND deleted_at IS NULL
       LIMIT 1`,
      [input.assigneeUserId]
    );

    if (!assigneeCheck.rows[0]) {
      return null;
    }
  }

  if (input.relatedMeetingNoteId) {
    const noteCheck = await query<{ id: string }>(
      `SELECT id::text
       FROM meeting_notes
       WHERE id = $1
         AND project_id = $2
         AND deleted_at IS NULL
       LIMIT 1`,
      [input.relatedMeetingNoteId, input.projectId]
    );

    if (!noteCheck.rows[0]) {
      return null;
    }
  }

  const result = await query<{ id: string }>(
    `INSERT INTO tasks (
       project_id,
       title,
       description,
       status,
       priority,
       assignee_user_id,
       due_date,
       related_meeting_note_id,
       created_by,
       updated_by
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7::date, $8, $9, $9)
     RETURNING id::text`,
    [
      input.projectId,
      input.title,
      input.description ?? null,
      input.status,
      input.priority,
      input.assigneeUserId ?? null,
      input.dueDate ?? null,
      input.relatedMeetingNoteId ?? null,
      actor.userId
    ]
  );

  const taskId = result.rows[0]?.id;
  if (!taskId) {
    return null;
  }

  await writeAuditLog({
    actor,
    projectId: input.projectId,
    actionType: 'task_created',
    targetType: 'task',
    targetId: taskId,
    metadata: {
      title: input.title,
      status: input.status,
      priority: input.priority,
      relatedMeetingNoteId: input.relatedMeetingNoteId ?? null
    }
  });

  return taskId;
}

export async function updateTask(
  taskId: string,
  input: z.infer<typeof taskFormSchema>,
  actor: SessionUser
): Promise<{ id: string; projectId: string } | null> {
  if (input.assigneeUserId) {
    const assigneeCheck = await query<{ id: string }>(
      `SELECT id::text
       FROM users
       WHERE id = $1
         AND is_active = TRUE
         AND deleted_at IS NULL
       LIMIT 1`,
      [input.assigneeUserId]
    );

    if (!assigneeCheck.rows[0]) {
      return null;
    }
  }

  if (input.relatedMeetingNoteId) {
    const noteCheck = await query<{ id: string }>(
      `SELECT id::text
       FROM meeting_notes
       WHERE id = $1
         AND project_id = $2
         AND deleted_at IS NULL
       LIMIT 1`,
      [input.relatedMeetingNoteId, input.projectId]
    );

    if (!noteCheck.rows[0]) {
      return null;
    }
  }

  const result = await query<{ id: string; projectId: string }>(
    `UPDATE tasks t
     SET project_id = $2,
         title = $3,
         description = $4,
         status = $5,
         priority = $6,
         assignee_user_id = $7,
         due_date = $8::date,
         related_meeting_note_id = $9,
         updated_by = $10,
         updated_at = NOW()
     WHERE t.id = $1
       AND t.deleted_at IS NULL
       AND EXISTS (
         SELECT 1
         FROM projects p
         WHERE p.id = $2
           AND p.deleted_at IS NULL
       )
     RETURNING t.id::text, t.project_id::text AS "projectId"`,
    [
      taskId,
      input.projectId,
      input.title,
      input.description ?? null,
      input.status,
      input.priority,
      input.assigneeUserId ?? null,
      input.dueDate ?? null,
      input.relatedMeetingNoteId ?? null,
      actor.userId
    ]
  );

  const row = result.rows[0] ?? null;
  if (!row) {
    return null;
  }

  await writeAuditLog({
    actor,
    projectId: row.projectId,
    actionType: 'task_updated',
    targetType: 'task',
    targetId: row.id,
    metadata: {
      title: input.title,
      status: input.status,
      priority: input.priority,
      relatedMeetingNoteId: input.relatedMeetingNoteId ?? null
    }
  });

  return row;
}

export async function deleteTask(taskId: string, actor: SessionUser): Promise<{ id: string; projectId: string } | null> {
  const result = await query<{ id: string; projectId: string }>(
    `UPDATE tasks t
     SET deleted_at = NOW(),
         updated_by = $2,
         updated_at = NOW()
     WHERE t.id = $1
       AND t.deleted_at IS NULL
     RETURNING t.id::text, t.project_id::text AS "projectId"`,
    [taskId, actor.userId]
  );

  const row = result.rows[0] ?? null;
  if (!row) {
    return null;
  }

  await writeAuditLog({
    actor,
    projectId: row.projectId,
    actionType: 'task_deleted',
    targetType: 'task',
    targetId: row.id,
    metadata: {}
  });

  return row;
}
