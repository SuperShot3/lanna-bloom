import { auth } from '@/auth';
import { canChangeStatus } from '@/lib/adminRbac';
import { getCatalogProductByIdForAdmin } from '@/lib/catalogAdmin';
import { notFound, redirect } from 'next/navigation';
import { AdminProductDetailClient } from '../../../moderation/products/[productId]/AdminProductDetailClient';

type PageProps = { params: Promise<{ productId: string }> };

export default async function AdminProductEditorPage({ params }: PageProps) {
  const { productId } = await params;
  const session = await auth();
  if (!session?.user) redirect('/admin/login');

  const role = (session.user as { role?: string }).role;
  if (!canChangeStatus(role)) redirect('/admin');

  const product = await getCatalogProductByIdForAdmin(productId);
  if (!product) notFound();

  return <AdminProductDetailClient product={product} />;
}
