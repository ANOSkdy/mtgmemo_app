'use client';

import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';

export function ChatPostForm({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    setIsPending(true);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/chat/post', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        setErrorMessage(body?.error ?? '投稿に失敗しました。');
        return;
      }

      form.reset();
      router.refresh();
    } catch {
      setErrorMessage('投稿に失敗しました。');
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="entityForm">
      <label>
        メッセージ
        <textarea name="message" rows={3} maxLength={1000} required />
      </label>
      <input type="hidden" name="projectId" value={projectId} />
      {errorMessage ? <p className="errorText">{errorMessage}</p> : null}
      <div className="formActions">
        <button type="submit" disabled={isPending}>
          {isPending ? '送信中...' : '投稿'}
        </button>
      </div>
    </form>
  );
}
