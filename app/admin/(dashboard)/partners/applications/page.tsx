import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { listPartnerApplications } from '@/lib/supabase/partnerQueries';
import { canChangeStatus } from '@/lib/adminRbac';
import { PartnerApplicationsClient } from './PartnerApplicationsClient';

export default async function AdminPartnerApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect('/admin/login');

  const role = (session.user as { role?: string }).role;
  if (!canChangeStatus(role)) {
    redirect('/admin');
  }

  const params = await searchParams;
  const status = params.status ?? 'all';
  const applications = await listPartnerApplications(status === 'all' ? undefined : status);

  return (
    <PartnerApplicationsClient
      initialApplications={applications}
      initialStatus={status}
    />
  );
}
