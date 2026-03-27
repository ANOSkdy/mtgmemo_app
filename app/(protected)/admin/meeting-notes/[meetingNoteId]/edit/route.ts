import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireSessionUser } from '@/lib/auth';
import { deleteMeetingNote, meetingNoteFormSchema, updateMeetingNote } from '@/lib/phase3';

export const runtime = 'nodejs';

const paramsSchema = z.object({
  meetingNoteId: z.string().uuid()
});

function asString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === 'string' ? value : '';
}

export async function POST(
  request: Request,
  { params }: { params: { meetingNoteId: string } }
) {
  const sessionUser = await requireSessionUser();
  if (sessionUser.role !== 'global') {
    return new Response('Forbidden', { status: 403 });
  }

  const parsedParams = paramsSchema.safeParse(params);
  if (!parsedParams.success) {
    return new Response('Not Found', { status: 404 });
  }

  const formData = await request.formData();
  const intent = asString(formData, 'intent');

  if (intent === 'delete') {
    const deleted = await deleteMeetingNote(parsedParams.data.meetingNoteId, sessionUser);
    if (!deleted) {
      return new Response('Not Found', { status: 404 });
    }

    return NextResponse.redirect(new URL(`/project/${deleted.projectId}/meeting-notes`, request.url));
  }

  const parsed = meetingNoteFormSchema.safeParse({
    projectId: asString(formData, 'projectId'),
    title: asString(formData, 'title'),
    meetingDate: asString(formData, 'meetingDate'),
    content: asString(formData, 'content')
  });

  if (!parsed.success) {
    return NextResponse.redirect(
      new URL(`/admin/meeting-notes/${parsedParams.data.meetingNoteId}/edit?error=validation`, request.url)
    );
  }

  const updated = await updateMeetingNote(parsedParams.data.meetingNoteId, parsed.data, sessionUser);
  if (!updated) {
    return NextResponse.redirect(
      new URL(`/admin/meeting-notes/${parsedParams.data.meetingNoteId}/edit?error=validation`, request.url)
    );
  }

  return NextResponse.redirect(new URL(`/project/${updated.projectId}/meeting-notes/${updated.id}`, request.url));
}
