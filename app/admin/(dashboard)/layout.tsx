import { auth } from '@/auth';
import { redirect } from 'next/navigation';

// Admin dashboard must always reflect fresh operational data (orders, payments, etc.).
// Disable static rendering/caching for this segment.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AdminDashboardLayout({
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
