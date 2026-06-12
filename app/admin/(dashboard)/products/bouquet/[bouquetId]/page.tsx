import { auth } from '@/auth';
import { canChangeStatus } from '@/lib/adminRbac';
import { getCatalogBouquetDetailForAdmin } from '@/lib/catalogAdmin';
import { notFound, redirect } from 'next/navigation';
import { AdminBouquetDetailClient } from './AdminBouquetDetailClient';

type PageProps = { params: Promise<{ bouquetId: string }> };

export default async function AdminBouquetEditorPage({ params }: PageProps) {
  const { bouquetId } = await params;
  const session = await auth();
  if (!session?.user) redirect('/admin/login');

  const role = (session.user as { role?: string }).role;
  if (!canChangeStatus(role)) redirect('/admin');

  const bouquet = await getCatalogBouquetDetailForAdmin(bouquetId);
  if (!bouquet) notFound();

  return <AdminBouquetDetailClient bouquet={bouquet} />;
}
