import { auth } from '@/auth';
import { redirect } from 'next/navigation';

export default async function AdminV2DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect('/admin/login');
  }
  return <>{children}</>;
}
