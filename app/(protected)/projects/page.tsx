import Link from 'next/link';
import { listProjectsForUser } from '@/lib/access';
import { requireSessionUser } from '@/lib/auth';

export default async function ProjectsPage() {
  const sessionUser = await requireSessionUser();
  const projects = await listProjectsForUser(sessionUser.userId, sessionUser.role);

  return (
    <section className="card">
      <h2>案件選択</h2>
      <p>閲覧可能な案件を選択してください。</p>
      {projects.length === 0 ? (
        <p>閲覧可能な案件がありません。</p>
      ) : (
        <ul className="projectList">
          {projects.map((project) => (
            <li key={project.id}>
              <Link className="projectLink" href={`/project/${project.id}`}>
                {project.name}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
