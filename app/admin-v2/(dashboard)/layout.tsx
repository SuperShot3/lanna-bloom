import { getAdminSecret } from '../actions';
import { redirect } from 'next/navigation';

export default async function AdminV2DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const secret = await getAdminSecret();
  if (!secret) {
    redirect('/admin-v2');
  }
  return <>{children}</>;
}
