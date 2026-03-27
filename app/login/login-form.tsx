'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function LoginForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const email = formData.get('email');
    const password = formData.get('password');

    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });

    if (!response.ok) {
      setError('メールアドレスまたはパスワードが正しくありません。');
      setLoading(false);
      return;
    }

    router.replace('/projects');
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="loginForm">
      <label>
        メールアドレス
        <input name="email" type="email" autoComplete="email" required />
      </label>
      <label>
        パスワード
        <input name="password" type="password" autoComplete="current-password" required />
      </label>
      {error ? <p className="errorText">{error}</p> : null}
      <button type="submit" disabled={loading}>
        {loading ? 'ログイン中...' : 'ログイン'}
      </button>
    </form>
  );
}
