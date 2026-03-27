import { redirect } from 'next/navigation';
import { LoginForm } from '@/app/login/login-form';
import { getSessionUser } from '@/lib/auth';

export default async function LoginPage() {
  const sessionUser = await getSessionUser();
  if (sessionUser) {
    redirect('/projects');
  }

  return (
    <main className="loginPage">
      <section className="card loginCard">
        <h1>MTG Memo ログイン</h1>
        <p>登録済みメールアドレスでログインしてください。</p>
        <LoginForm />
      </section>
    </main>
  );
}
