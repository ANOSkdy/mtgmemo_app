import { notFound } from 'next/navigation';
import { z } from 'zod';
import { findProjectForUser } from '@/lib/access';
import { requireSessionUser } from '@/lib/auth';
import { formatDateTime } from '@/lib/phase2-view';
import { listChatMessagesByProject } from '@/lib/phase4';
import { ChatPostForm } from '@/app/(protected)/project/[projectId]/chat/post-form';

const paramsSchema = z.object({
  projectId: z.string().trim().min(1)
});

export default async function ProjectChatPage({
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

  const messages = await listChatMessagesByProject(project.id);

  return (
    <section className="card">
      <h2>グループチャット</h2>
      <p>{project.name}</p>

      <ChatPostForm projectId={project.id} />

      <div className="listStack">
        {messages.length === 0 ? (
          <p>メッセージはまだありません。</p>
        ) : (
          messages.map((message) => (
            <article className="commentItem" key={message.id}>
              <div className="listItemHeader">
                <strong>{message.postedByName}</strong>
                <div className="formActions">
                  <span>{formatDateTime(message.createdAt)}</span>
                  {sessionUser.role === 'global' ? (
                    <form action={`/api/chat/${message.id}/delete`} method="post">
                      <input type="hidden" name="projectId" value={project.id} />
                      <button type="submit" className="dangerButton">
                        削除
                      </button>
                    </form>
                  ) : null}
                </div>
              </div>
              <p className="plainText">{message.message}</p>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
