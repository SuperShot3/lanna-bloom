import Link from 'next/link';

export default function AdminOrderNotFound() {
  return (
    <div className="admin-detail">
      <div className="admin-error">
        <p><strong>Order not found</strong></p>
        <p>The order may not exist in Supabase or the ID may be incorrect.</p>
        <Link href="/admin/orders" className="admin-link">
          ← Back to orders
        </Link>
      </div>
    </div>
  );
}
