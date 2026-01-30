import Link from 'next/link';
import { defaultLocale } from '@/lib/i18n';

export default function NotFound() {
  return (
    <div className="not-found">
      <div className="container">
        <h1 className="not-found-title">404</h1>
        <p className="not-found-text">Page not found</p>
        <Link href={`/${defaultLocale}`} className="not-found-link">
          Go to home
        </Link>
      </div>
    </div>
  );
}
