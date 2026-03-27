import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="page">
      <section className="card">
        <h1>ページが見つかりません</h1>
        <p>アクセス権限がないか、案件が存在しません。</p>
        <Link href="/projects" className="secondaryButton">
          案件一覧へ戻る
        </Link>
      </section>
    </main>
  );
}
