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
    <div className="admin-detail admin-product-detail">
      <header className="admin-header">
        <div>
          <Link href="/admin/moderation/products" className="admin-link">
            ← Back to products
          </Link>
          <h1 className="admin-title">Product review</h1>
        </div>
        <div className="admin-header-actions">
          <Link href="/admin" className="admin-btn admin-btn-outline">
            Dashboard
          </Link>
          <Link href="/admin/orders" className="admin-btn admin-btn-outline">
            Orders
          </Link>
          <a href="/api/auth/signout?callbackUrl=/admin/login" className="admin-btn admin-btn-outline">
            Log out
          </a>
        </div>
      </header>

      <AdminProductDetailClient product={product} />
    </div>
  );
}
