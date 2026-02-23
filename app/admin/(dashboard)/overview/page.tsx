import { redirect } from 'next/navigation';

/** Redirect /admin/overview to /admin/orders (single admin URL). */
export default function AdminOverviewRedirectPage() {
  redirect('/admin/orders');
}
