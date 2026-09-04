import type { Metadata } from 'next';
import { buildOrderShareMetadata } from '@/lib/orders/orderShareMetadata';
import './order.css';
import '../not-found.css';

export const dynamic = 'force-dynamic';

/** Generic order card so /order never inherits the homepage flower OG image. */
export const metadata: Metadata = buildOrderShareMetadata({
  orderId: '',
  token: '',
});

export default function OrderLayout({ children }: { children: React.ReactNode }) {
  return children;
}
