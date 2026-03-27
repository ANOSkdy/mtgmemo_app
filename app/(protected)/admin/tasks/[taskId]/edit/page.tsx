import { notFound } from 'next/navigation';
import { z } from 'zod';
import { requireSessionUser } from '@/lib/auth';
import { priorityLabels, statusLabels } from '@/lib/phase2-view';
import {
  findTaskForEdit,
  listAssignableUsers,
  listMeetingNoteOptions,
  listProjectOptions,
  taskPriorities,
  taskStatuses
} from '@/lib/phase3';

const paramsSchema = z.object({
  taskId: z.string().uuid()
});

function pickString(value: string | string[] | undefined): string {
  return typeof value === 'string' ? value : '';
}

export default async function EditTaskPage({
  params,
  searchParams
}: {
  params: Promise<{ taskId: string }>;
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const sessionUser = await requireSessionUser();
  if (sessionUser.role !== 'global') {
    notFound();
  }

  const parsedParams = paramsSchema.safeParse(await params);
  if (!parsedParams.success) {
    notFound();
  }

  const [task, projects, users, noteOptions] = await Promise.all([
    findTaskForEdit(parsedParams.data.taskId),
    listProjectOptions(),
    listAssignableUsers(),
    listMeetingNoteOptions()
  ]);

  if (!task) {
    notFound();
  }

  const error = pickString(searchParams.error);

  return (
    <section className="card">
      <h2>タスク編集</h2>
      {error ? <p className="errorText">入力内容を確認してください。</p> : null}
      <form method="post" className="entityForm">
        <label>
          案件
          <select name="projectId" defaultValue={task.projectId} required>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          タイトル
          <input name="title" type="text" required maxLength={200} defaultValue={task.title} />
        </label>
        <label>
          詳細
          <textarea name="description" rows={8} defaultValue={task.description} />
        </label>
        <label>
          ステータス
          <select name="status" defaultValue={task.status} required>
            {taskStatuses.map((status) => (
              <option key={status} value={status}>
                {statusLabels[status]}
              </option>
            ))}
          </select>
        </label>
        <label>
          優先度
          <select name="priority" defaultValue={task.priority} required>
            {taskPriorities.map((priority) => (
              <option key={priority} value={priority}>
                {priorityLabels[priority]}
              </option>
            ))}
          </select>
        </label>
        <label>
          担当者
          <select name="assigneeUserId" defaultValue={task.assigneeUserId ?? ''}>
            <option value="">未設定</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name} ({user.email})
              </option>
            ))}
          </select>
        </label>
        <label>
          期限
          <input name="dueDate" type="date" defaultValue={task.dueDate ?? ''} />
        </label>
        <label>
          関連議事録
          <select name="relatedMeetingNoteId" defaultValue={task.relatedMeetingNoteId ?? ''}>
            <option value="">未設定</option>
            {noteOptions.map((note) => (
              <option key={note.id} value={note.id}>
                {note.projectName} / {note.title}
              </option>
            ))}
          </select>
        </label>
        <div className="formActions">
          <button type="submit" name="intent" value="update">
            保存
          </button>
          <button type="submit" name="intent" value="delete" className="dangerButton">
            削除
          </button>
        </div>
      </form>
    </section>
  );
}
