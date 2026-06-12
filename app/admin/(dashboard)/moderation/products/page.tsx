import { redirect } from 'next/navigation';

/** Legacy route — products live under /admin/products. */
export default function AdminModerationProductsRedirect() {
  redirect('/admin/products?group=pending');
}
