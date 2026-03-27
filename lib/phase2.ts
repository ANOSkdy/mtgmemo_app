import 'server-only';

import { query } from '@/lib/db';

export type MeetingNoteListItem = {
  id: string;
  title: string;
  meetingDate: string | null;
  authorName: string | null;
  updatedAt: string;
};

export type MeetingNoteDetail = {
  id: string;
  title: string;
  meetingDate: string | null;
  content: string;
  createdAt: string;
  updatedAt: string;
  createdByName: string | null;
  updatedByName: string | null;
};

export type TaskRelatedItem = {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
};

export type TaskStatus = 'not_started' | 'in_progress' | 'done';
export type TaskPriority = 'high' | 'medium' | 'low';

export type TaskListItem = {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeName: string | null;
  dueDate: string | null;
  updatedAt: string;
};

export type TaskCommentItem = {
  id: string;
  comment: string;
  createdAt: string;
  createdByName: string | null;
};

export type TaskDetail = {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeName: string | null;
  dueDate: string | null;
  updatedAt: string;
  relatedMeetingNoteId: string | null;
  relatedMeetingNoteTitle: string | null;
};

type MeetingNoteListRow = {
  id: string;
  title: string;
  meeting_date: string | null;
  author_name: string | null;
  updated_at: string;
};

export async function listMeetingNotesByProject(projectId: string): Promise<MeetingNoteListItem[]> {
  const result = await query<MeetingNoteListRow>(
    `SELECT mn.id::text,
            mn.title,
            mn.meeting_date::text,
            u.name AS author_name,
            mn.updated_at::text
     FROM meeting_notes mn
     LEFT JOIN users u
       ON u.id = mn.created_by
      AND u.deleted_at IS NULL
     WHERE mn.project_id = $1
       AND mn.deleted_at IS NULL
     ORDER BY mn.meeting_date DESC NULLS LAST, mn.updated_at DESC`,
    [projectId]
  );

  return result.rows.map((row) => ({
    id: row.id,
    title: row.title,
    meetingDate: row.meeting_date,
    authorName: row.author_name,
    updatedAt: row.updated_at
  }));
}

type MeetingNoteDetailRow = {
  id: string;
  title: string;
  meeting_date: string | null;
  content: string | null;
  created_at: string;
  updated_at: string;
  created_by_name: string | null;
  updated_by_name: string | null;
};

export async function findMeetingNoteDetail(
  projectId: string,
  meetingNoteId: string
): Promise<MeetingNoteDetail | null> {
  const result = await query<MeetingNoteDetailRow>(
    `SELECT mn.id::text,
            mn.title,
            mn.meeting_date::text,
            mn.content,
            mn.created_at::text,
            mn.updated_at::text,
            u_created.name AS created_by_name,
            u_updated.name AS updated_by_name
     FROM meeting_notes mn
     LEFT JOIN users u_created
       ON u_created.id = mn.created_by
      AND u_created.deleted_at IS NULL
     LEFT JOIN users u_updated
       ON u_updated.id = mn.updated_by
      AND u_updated.deleted_at IS NULL
     WHERE mn.project_id = $1
       AND mn.id = $2
       AND mn.deleted_at IS NULL
     LIMIT 1`,
    [projectId, meetingNoteId]
  );

  const row = result.rows[0];
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    title: row.title,
    meetingDate: row.meeting_date,
    content: row.content ?? '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdByName: row.created_by_name,
    updatedByName: row.updated_by_name
  };
}

type RelatedTaskRow = {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
};

export async function listTasksByMeetingNote(
  projectId: string,
  meetingNoteId: string
): Promise<TaskRelatedItem[]> {
  const result = await query<RelatedTaskRow>(
    `SELECT t.id::text,
            t.title,
            t.status,
            t.priority
     FROM tasks t
     WHERE t.project_id = $1
       AND t.related_meeting_note_id = $2
       AND t.deleted_at IS NULL
     ORDER BY t.updated_at DESC`,
    [projectId, meetingNoteId]
  );

  return result.rows;
}

type TaskListRow = {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee_name: string | null;
  due_date: string | null;
  updated_at: string;
};

export async function listTasksByProject(projectId: string): Promise<TaskListItem[]> {
  const result = await query<TaskListRow>(
    `SELECT t.id::text,
            t.title,
            t.status,
            t.priority,
            u.name AS assignee_name,
            t.due_date::text,
            t.updated_at::text
     FROM tasks t
     LEFT JOIN users u
       ON u.id = t.assignee_user_id
      AND u.deleted_at IS NULL
     WHERE t.project_id = $1
       AND t.deleted_at IS NULL
     ORDER BY t.updated_at DESC`,
    [projectId]
  );

  return result.rows.map((row) => ({
    id: row.id,
    title: row.title,
    status: row.status,
    priority: row.priority,
    assigneeName: row.assignee_name,
    dueDate: row.due_date,
    updatedAt: row.updated_at
  }));
}

type TaskDetailRow = {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assignee_name: string | null;
  due_date: string | null;
  updated_at: string;
  related_meeting_note_id: string | null;
  related_meeting_note_title: string | null;
};

export async function findTaskDetail(projectId: string, taskId: string): Promise<TaskDetail | null> {
  const result = await query<TaskDetailRow>(
    `SELECT t.id::text,
            t.title,
            t.description,
            t.status,
            t.priority,
            u.name AS assignee_name,
            t.due_date::text,
            t.updated_at::text,
            t.related_meeting_note_id::text,
            mn.title AS related_meeting_note_title
     FROM tasks t
     LEFT JOIN users u
       ON u.id = t.assignee_user_id
      AND u.deleted_at IS NULL
     LEFT JOIN meeting_notes mn
       ON mn.id = t.related_meeting_note_id
      AND mn.deleted_at IS NULL
     WHERE t.project_id = $1
       AND t.id = $2
       AND t.deleted_at IS NULL
     LIMIT 1`,
    [projectId, taskId]
  );

  const row = result.rows[0];
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    title: row.title,
    description: row.description ?? '',
    status: row.status,
    priority: row.priority,
    assigneeName: row.assignee_name,
    dueDate: row.due_date,
    updatedAt: row.updated_at,
    relatedMeetingNoteId: row.related_meeting_note_id,
    relatedMeetingNoteTitle: row.related_meeting_note_title
  };
}

type TaskCommentRow = {
  id: string;
  comment: string;
  created_at: string;
  created_by_name: string | null;
};

export async function listTaskComments(taskId: string): Promise<TaskCommentItem[]> {
  const result = await query<TaskCommentRow>(
    `SELECT tc.id::text,
            tc.comment,
            tc.created_at::text,
            u.name AS created_by_name
     FROM task_comments tc
     LEFT JOIN users u
       ON u.id = tc.created_by
      AND u.deleted_at IS NULL
     WHERE tc.task_id = $1
       AND tc.deleted_at IS NULL
     ORDER BY tc.created_at ASC`,
    [taskId]
  );

  return result.rows.map((row) => ({
    id: row.id,
    comment: row.comment,
    createdAt: row.created_at,
    createdByName: row.created_by_name
  }));
}
