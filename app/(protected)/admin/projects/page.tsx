import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireSessionUser } from '@/lib/auth';
import { listProjects } from '@/lib/phase5';

export default async function AdminProjectsPage() {
  const sessionUser = await requireSessionUser();
  if (sessionUser.role !== 'global') {
    notFound();
  }

  const projects = await listProjects();

  return (
    <section className="card">
      <div className="cardHeaderRow">
        <h2>案件管理</h2>
        <Link href="/admin/projects/new" className="secondaryButton">
          新規登録
        </Link>
      </div>
      {projects.length === 0 ? (
        <p>案件がありません。</p>
      ) : (
        <ul className="simpleList">
          {projects.map((project) => (
            <li key={project.id} className="simpleListItem">
              <div className="listItemHeader">
                <strong>{project.projectName}</strong>
                <div className="badgeGroup">
                  <span className="badge">{project.status}</span>
                  {project.deletedAt ? <span className="badge">deleted</span> : null}
                </div>
              </div>
              <p>{project.clientName}</p>
              {!project.deletedAt ? (
                <Link href={`/admin/projects/${project.id}/edit`} className="secondaryButton">
                  編集
                </Link>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
