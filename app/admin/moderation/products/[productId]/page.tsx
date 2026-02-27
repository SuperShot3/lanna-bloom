import { auth } from '@/auth';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getProductByIdForAdmin } from '@/lib/sanity';
import { canChangeStatus } from '@/lib/adminRbac';
import { AdminProductDetailClient } from './AdminProductDetailClient';

type PageProps = { params: Promise<{ productId: string }> };

export default async function AdminProductDetailPage({ params }: PageProps) {
  const { productId } = await params;
  const session = await auth();
  if (!session?.user) redirect('/admin/login');

  const role = (session.user as { role?: string }).role;
  if (!canChangeStatus(role)) redirect('/admin');

  const product = await getProductByIdForAdmin(productId);
  if (!product) notFound();

  return (
    <div className="admin-v2-detail admin-product-detail">
      <header className="admin-v2-header">
        <div>
          <Link href="/admin/moderation/products" className="admin-v2-link">
            ← Back to products
          </Link>
          <h1 className="admin-v2-title">Product review</h1>
        </div>
        <div className="admin-v2-header-actions">
          <Link href="/admin" className="admin-v2-btn admin-v2-btn-outline">
            Dashboard
          </Link>
          <Link href="/admin/orders" className="admin-v2-btn admin-v2-btn-outline">
            Orders
          </Link>
          <a href="/api/auth/signout?callbackUrl=/admin/login" className="admin-v2-btn admin-v2-btn-outline">
            Log out
          </a>
        </div>
      </header>

      <AdminProductDetailClient product={product} />
    </div>
  );
}
