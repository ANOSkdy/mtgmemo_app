'use client';

import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';

export function FileUploadForm({ projectId }: { projectId: string }) {
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
      const response = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        setErrorMessage(body?.error ?? 'アップロードに失敗しました。');
        return;
      }

      form.reset();
      router.refresh();
    } catch {
      setErrorMessage('アップロードに失敗しました。');
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="entityForm">
      <label>
        ファイル（最大50MB）
        <input type="file" name="file" required />
      </label>
      <input type="hidden" name="projectId" value={projectId} />
      {errorMessage ? <p className="errorText">{errorMessage}</p> : null}
      <div className="formActions">
        <button type="submit" disabled={isPending}>
          {isPending ? 'アップロード中...' : 'アップロード'}
        </button>
      </div>
    </form>
  );
}
