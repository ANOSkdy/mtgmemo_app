import { NextResponse } from 'next/server';
import { requireSessionUser } from '@/lib/auth';
import { createMeetingNote, meetingNoteFormSchema } from '@/lib/phase3';

export const runtime = 'nodejs';

function asString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === 'string' ? value : '';
}

export async function POST(request: Request) {
  const sessionUser = await requireSessionUser();
  if (sessionUser.role !== 'global') {
    return new Response('Forbidden', { status: 403 });
  }

  const formData = await request.formData();
  const parsed = meetingNoteFormSchema.safeParse({
    projectId: asString(formData, 'projectId'),
    title: asString(formData, 'title'),
    meetingDate: asString(formData, 'meetingDate'),
    content: asString(formData, 'content')
  });

  if (!parsed.success) {
    return NextResponse.redirect(new URL(`/admin/meeting-notes/new?error=validation`, request.url));
  }

  const noteId = await createMeetingNote(parsed.data, sessionUser);
  if (!noteId) {
    return NextResponse.redirect(new URL(`/admin/meeting-notes/new?error=validation`, request.url));
  }

  return NextResponse.redirect(
    new URL(`/project/${parsed.data.projectId}/meeting-notes/${noteId}`, request.url)
  );
}
