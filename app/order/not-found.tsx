import Link from 'next/link';
import { defaultLocale } from '@/lib/i18n';

export default function OrderNotFound() {
  return (
    <div className="not-found">
      <div className="container">
        <h1 className="not-found-title">Order not found</h1>
        <p className="not-found-text">
          This order link is invalid or the order is no longer available.
        </p>
        <Link href={`/${defaultLocale}`} className="not-found-link">
          Go to home
        </Link>
      </div>
    </div>
  );
}
