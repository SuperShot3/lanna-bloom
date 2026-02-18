import Link from 'next/link';

export default function AdminV2OrderNotFound() {
  return (
    <div className="admin-v2-detail">
      <div className="admin-v2-error">
        <p><strong>Order not found</strong></p>
        <p>The order may not exist in Supabase or the ID may be incorrect.</p>
        <Link href="/admin-v2/orders" className="admin-v2-link">
          ← Back to orders
        </Link>
      </div>
    </div>
  );
}
