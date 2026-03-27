import Link from 'next/link';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { findProjectForUser } from '@/lib/access';
import { requireSessionUser } from '@/lib/auth';
import { listTasksByProject } from '@/lib/phase2';
import { formatDate, formatDateTime, priorityBadgeClassName, priorityLabels, statusLabels } from '@/lib/phase2-view';

const paramsSchema = z.object({
  projectId: z.string().trim().min(1)
});

export default async function TasksPage({
  params
}: {
  params: Promise<{ projectId: string }>;
}) {
  const sessionUser = await requireSessionUser();
  const parsed = paramsSchema.safeParse(await params);

  if (!parsed.success) {
    notFound();
  }

  const project = await findProjectForUser(parsed.data.projectId, sessionUser.userId, sessionUser.role);
  if (!project) {
    notFound();
  }

  const tasks = await listTasksByProject(project.id);

  return (
    <section className="card">
      <div className="cardHeaderRow">
        <h2>タスク一覧</h2>
        {sessionUser.role === 'global' ? (
          <Link href={`/admin/tasks/new?projectId=${project.id}`} className="secondaryButton">
            新規作成
          </Link>
        ) : null}
      </div>
      <p>{project.name}</p>
      <div className="listStack">
        {tasks.length === 0 ? (
          <p>タスクはまだありません。</p>
        ) : (
          tasks.map((task) => (
            <article className="panel listItem" key={task.id}>
              <div className="listItemHeader">
                <h3>
                  <Link href={`/project/${project.id}/tasks/${task.id}`}>{task.title}</Link>
                </h3>
                <div className="badgeGroup">
                  <span className="badge">{statusLabels[task.status]}</span>
                  <span className={`badge ${priorityBadgeClassName[task.priority]}`}>
                    {priorityLabels[task.priority]}
                  </span>
                </div>
              </div>
              <dl className="metaList">
                <div>
                  <dt>担当者</dt>
                  <dd>{task.assigneeName ?? '—'}</dd>
                </div>
                <div>
                  <dt>期限</dt>
                  <dd>{formatDate(task.dueDate)}</dd>
                </div>
                <div>
                  <dt>更新日時</dt>
                  <dd>{formatDateTime(task.updatedAt)}</dd>
                </div>
              </dl>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
