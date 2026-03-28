import { notFound } from 'next/navigation';
import { z } from 'zod';
import { findProjectForUser } from '@/lib/access';
import { requireSessionUser } from '@/lib/auth';
import { formatDateTime } from '@/lib/phase2-view';
import { formatBytes, listSharedFilesByProject } from '@/lib/phase4';
import { FileUploadForm } from '@/app/(protected)/project/[projectId]/files/upload-form';

const paramsSchema = z.object({
  projectId: z.string().trim().min(1)
});

export default async function ProjectFilesPage({
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

  const files = await listSharedFilesByProject(project.id);

  return (
    <section className="card">
      <h2>共有フォルダ</h2>
      <p>{project.name}</p>

      <FileUploadForm projectId={project.id} />

      <div className="listStack">
        {files.length === 0 ? (
          <p>共有ファイルはまだありません。</p>
        ) : (
          files.map((file) => (
            <article className="panel listItem" key={file.id}>
              <div className="listItemHeader">
                <h3 className="safeBreak">{file.fileName}</h3>
                <div className="formActions">
                  <a
                    href={`/api/files/${file.id}/download?projectId=${project.id}`}
                    className="secondaryButton"
                    download={file.fileName}
                  >
                    ダウンロード
                  </a>
                  {sessionUser.role === 'global' ? (
                    <form action={`/api/files/${file.id}/delete`} method="post">
                      <input type="hidden" name="projectId" value={project.id} />
                      <button type="submit" className="dangerButton">
                        削除
                      </button>
                    </form>
                  ) : null}
                </div>
              </div>
              <dl className="metaList">
                <div>
                  <dt>種別</dt>
                  <dd className="safeBreak">{file.mimeType}</dd>
                </div>
                <div>
                  <dt>サイズ</dt>
                  <dd>{formatBytes(file.fileSize)}</dd>
                </div>
                <div>
                  <dt>登録者</dt>
                  <dd className="safeBreak">{file.uploadedByName}</dd>
                </div>
                <div>
                  <dt>登録日時</dt>
                  <dd>{formatDateTime(file.createdAt)}</dd>
                </div>
              </dl>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
