export default function HomePage() {
  return (
    <main className="page">
      <section className="card" aria-labelledby="title">
        <h1 id="title">MTG Memo App</h1>
        <p>
          This baseline is safe for Vercel builds and does not require a database at build time.
        </p>
        <ul>
          <li>
            Health check: <a href="/api/health/db">/api/health/db</a>
          </li>
          <li>
            Todos API: <a href="/api/todos">/api/todos</a>
          </li>
        </ul>
        <p className="hint">Run migrations explicitly with: <code>pnpm db:migrate</code></p>
      </section>
    </main>
  );
}
