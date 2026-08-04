import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { canManageProvinces } from '@/lib/adminRbac';
import { listProvinces } from '@/lib/provinces/queries';
import { ProvincesAdminClient } from './ProvincesAdminClient';

export default async function AdminProvincesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; code?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect('/admin/login');

  const role = (session.user as { role?: string }).role;
  if (!canManageProvinces(role)) {
    redirect('/admin');
  }

  const params = await searchParams;
  const status = params.status ?? 'all';
  const result = await listProvinces();
  const provinces = result.ok ? result.provinces : [];

  return (
    <ProvincesAdminClient
      initialProvinces={provinces}
      initialStatus={status}
      initialSelectedCode={params.code ?? null}
      loadError={result.ok ? null : result.error}
    />
  );
}
