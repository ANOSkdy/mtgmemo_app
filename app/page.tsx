import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';

export default async function HomePage() {
  const sessionUser = await getSessionUser();
  redirect(sessionUser ? '/projects' : '/login');
}
