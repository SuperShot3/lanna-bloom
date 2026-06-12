import { auth } from '@/auth';
import { canChangeStatus } from '@/lib/adminRbac';
import { redirect } from 'next/navigation';
import { ProductCreateWizard } from './ProductCreateWizard';

export default async function AdminNewProductPage() {
  const session = await auth();
  if (!session?.user) redirect('/admin/login');

  const role = (session.user as { role?: string }).role;
  if (!canChangeStatus(role)) redirect('/admin');

  return <ProductCreateWizard adminEmail={session.user.email ?? 'admin'} />;
}
