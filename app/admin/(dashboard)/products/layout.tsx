import { Suspense } from 'react';
import { unstable_noStore as noStore } from 'next/cache';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getAdminCatalogIndex } from '@/lib/catalogAdmin';
import { canChangeStatus } from '@/lib/adminRbac';
import { ProductsStudioShell } from './ProductsStudioShell';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function ProductsRouteFallback() {
  return (
    <div className="admin-products-studio">
      <p className="admin-hint" style={{ padding: 24 }}>
        Loading products…
      </p>
    </div>
  );
}

export default async function ProductsLayout({ children }: { children: React.ReactNode }) {
  noStore();
  const session = await auth();
  if (!session?.user) redirect('/admin/login');

  const role = (session.user as { role?: string }).role;
  if (!canChangeStatus(role)) redirect('/admin');

  const index = await getAdminCatalogIndex();

  return (
    <Suspense fallback={<ProductsRouteFallback />}>
      <ProductsStudioShell index={index}>{children}</ProductsStudioShell>
    </Suspense>
  );
}
