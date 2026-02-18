import { redirect } from 'next/navigation';

/** Redirect legacy /admin/orders to admin-v2 orders list. */
export default function AdminOrdersRedirectPage() {
  redirect('/admin-v2/orders');
}
