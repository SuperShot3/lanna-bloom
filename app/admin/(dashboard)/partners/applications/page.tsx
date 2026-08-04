import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { listPartnerApplications } from '@/lib/supabase/partnerQueries';
import { listProvinces } from '@/lib/provinces/queries';
import { canChangeStatus } from '@/lib/adminRbac';
import { PartnerApplicationsClient } from './PartnerApplicationsClient';
import type { ProvinceOption } from './provinceOptions';

export default async function AdminPartnerApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; province?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect('/admin/login');

  const role = (session.user as { role?: string }).role;
  if (!canChangeStatus(role)) {
    redirect('/admin');
  }

  const params = await searchParams;
  const status = params.status ?? 'all';
  const province = params.province ?? 'all';

  const [applications, provincesResult] = await Promise.all([
    listPartnerApplications(
      status === 'all' ? undefined : status,
      province === 'all' ? undefined : province
    ),
    listProvinces(),
  ]);

  const provinces: ProvinceOption[] = provincesResult.ok
    ? provincesResult.provinces.map((p) => ({
        code: p.province_code,
        nameEn: p.province_name_en,
        nameTh: p.province_name_th,
      }))
    : [];

  return (
    <PartnerApplicationsClient
      initialApplications={applications}
      initialStatus={status}
      initialProvince={province}
      provinces={provinces}
    />
  );
}
