import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getPendingBouquets, getPendingProducts } from '@/lib/sanity';
import { canChangeStatus } from '@/lib/adminRbac';
import { ProductModerationClient } from './ProductModerationClient';

export default async function AdminModerationProductsPage() {
  const session = await auth();
  if (!session?.user) redirect('/admin/login');

  const role = (session.user as { role?: string }).role;
  if (!canChangeStatus(role)) redirect('/admin');

  const [bouquets, products] = await Promise.all([
    getPendingBouquets(),
    getPendingProducts(),
  ]);

  return (
    <ProductModerationClient
      initialBouquets={bouquets}
      initialProducts={products}
    />
  );
}
