import { auth } from '@/auth';
import { canChangeStatus } from '@/lib/adminRbac';
import { getBouquetById } from '@/lib/sanity';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { BouquetReviewClient } from './BouquetReviewClient';

type PageProps = { params: Promise<{ bouquetId: string }> };

export default async function AdminBouquetReviewPage({ params }: PageProps) {
  const { bouquetId } = await params;
  const session = await auth();
  if (!session?.user) redirect('/admin/login');

  const role = (session.user as { role?: string }).role;
  if (!canChangeStatus(role)) redirect('/admin');

  const bouquet = await getBouquetById(bouquetId);
  if (!bouquet) notFound();

  return (
    <div className="admin-detail admin-product-detail">
      <header className="admin-header">
        <div>
          <Link href="/admin/moderation/products" className="admin-link">
            ← Back to products
          </Link>
          <h1 className="admin-title">Bouquet review</h1>
          <p className="admin-hint">Share this admin page for review. It is not visible in the public catalog until approved.</p>
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

      <BouquetReviewClient bouquet={bouquet} />
    </div>
  );
}
