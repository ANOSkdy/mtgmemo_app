import Link from 'next/link';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { findProjectForUser } from '@/lib/access';
import { requireSessionUser } from '@/lib/auth';

const paramsSchema = z.object({
  projectId: z.string().trim().min(1)
});

export default async function ProjectHomePage({
  params
}: {
  params: Promise<{ projectId: string }>;
}) {
  const sessionUser = await requireSessionUser();
  const parsed = paramsSchema.safeParse(await params);

  if (!parsed.success) {
    notFound();
  }

  const project = await findProjectForUser(
    parsed.data.projectId,
    sessionUser.userId,
    sessionUser.role
  );

  if (!project) {
    notFound();
  }

  return (
    <section className="card">
      <h2>{project.name}</h2>
      <p>案件ホーム（Phase 1）</p>
      <div className="projectHomeGrid">
        <article className="panel">
          <h3>概要</h3>
          <p>この画面を起点に会議メモ・タスク等を追加予定です。</p>
        </article>
        <article className="panel">
          <h3>メニュー</h3>
          <ul>
            <li>
              <Link href={`/project/${project.id}/meeting-notes`}>議事録一覧</Link>
            </li>
            <li>
              <Link href={`/project/${project.id}/tasks`}>タスク一覧</Link>
            </li>
          </ul>
        </article>
      </div>
      <Link href="/projects" className="secondaryButton">
        案件選択へ戻る
      </Link>
    </section>
  );
}
