import { auth } from '@/auth';
import { redirect } from 'next/navigation';

export default async function AdminV2RootPage() {
  const session = await auth();
  if (session?.user) {
    redirect('/admin-v2/overview');
  }
  redirect('/admin-v2/login');
}
