import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { canManageRewards } from '@/lib/adminRbac';
import { RewardsAdminClient } from './RewardsAdminClient';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Rewards | Admin',
};

export default async function AdminRewardsPage() {
  const session = await auth();
  if (!session?.user) redirect('/admin/login');

  const role = (session.user as { role?: string }).role;
  if (!canManageRewards(role)) {
    redirect('/admin');
  }

  return <RewardsAdminClient />;
}
