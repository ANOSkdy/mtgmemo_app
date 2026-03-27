import { notFound } from 'next/navigation';
import { requireSessionUser } from '@/lib/auth';
import { priorityLabels, statusLabels } from '@/lib/phase2-view';
import {
  listAssignableUsers,
  listMeetingNoteOptions,
  listProjectOptions,
  taskPriorities,
  taskStatuses
} from '@/lib/phase3';

function pickString(value: string | string[] | undefined): string {
  return typeof value === 'string' ? value : '';
}

export default async function NewTaskPage({
  searchParams
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const sessionUser = await requireSessionUser();
  if (sessionUser.role !== 'global') {
    notFound();
  }

  const [projects, users, noteOptions] = await Promise.all([
    listProjectOptions(),
    listAssignableUsers(),
    listMeetingNoteOptions()
  ]);

  if (projects.length === 0) {
    return (
      <section className="card">
        <h2>タスク作成</h2>
        <p>利用可能な案件がありません。</p>
      </section>
    );
  }

  const selectedProjectId = pickString(searchParams.projectId);
  const error = pickString(searchParams.error);

  return (
    <section className="card">
      <h2>タスク作成</h2>
      {error ? <p className="errorText">入力内容を確認してください。</p> : null}
      <form action="/api/admin/tasks/new" method="post" className="entityForm">
        <label>
          案件
          <select name="projectId" defaultValue={selectedProjectId || projects[0]?.id} required>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          タイトル
          <input name="title" type="text" required maxLength={200} />
        </label>
        <label>
          詳細
          <textarea name="description" rows={8} />
        </label>
        <label>
          ステータス
          <select name="status" defaultValue="not_started" required>
            {taskStatuses.map((status) => (
              <option key={status} value={status}>
                {statusLabels[status]}
              </option>
            ))}
          </select>
        </label>
        <label>
          優先度
          <select name="priority" defaultValue="medium" required>
            {taskPriorities.map((priority) => (
              <option key={priority} value={priority}>
                {priorityLabels[priority]}
              </option>
            ))}
          </select>
        </label>
        <label>
          担当者
          <select name="assigneeUserId" defaultValue="">
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
          <input name="dueDate" type="date" />
        </label>
        <label>
          関連議事録
          <select name="relatedMeetingNoteId" defaultValue="">
            <option value="">未設定</option>
            {noteOptions.map((note) => (
              <option key={note.id} value={note.id}>
                {note.projectName} / {note.title}
              </option>
            ))}
          </select>
        </label>
        <div className="formActions">
          <button type="submit">登録</button>
        </div>
      </form>
    </section>
  );
}
