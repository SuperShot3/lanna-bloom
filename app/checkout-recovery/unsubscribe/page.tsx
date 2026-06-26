import Link from 'next/link';
import { optOutCheckoutRecoveryByToken } from '@/lib/checkout/checkoutRecoveryOptOut';

type Props = { searchParams: Promise<{ token?: string }> };

export const metadata = {
  title: 'Unsubscribe | Lanna Bloom',
  robots: { index: false, follow: false },
};

export default async function CheckoutRecoveryUnsubscribePage({ searchParams }: Props) {
  const { token = '' } = await searchParams;
  const t = (token || '').trim();

  if (!t) {
    return (
      <div style={{ minHeight: '60vh', padding: 24, textAlign: 'center', background: '#fdfcf8' }}>
        <p>Missing unsubscribe link. Return to the email we sent you.</p>
        <Link href="/en" style={{ color: '#967a4d' }}>
          Home
        </Link>
      </div>
    );
  }

  const result = await optOutCheckoutRecoveryByToken(t);

  if (!result.ok) {
    return (
      <div style={{ minHeight: '60vh', padding: 24, textAlign: 'center', background: '#fdfcf8' }}>
        <p>
          {result.reason === 'db_unavailable'
            ? 'Service temporarily unavailable. Please try again later.'
            : 'We could not find this link. It may have already been used or is invalid.'}
        </p>
        <Link href="/en" style={{ color: '#967a4d' }}>
          Home
        </Link>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '60vh',
        padding: 32,
        textAlign: 'center',
        background: '#fdfcf8',
        fontFamily: 'Mulish, system-ui, sans-serif',
        color: '#2c2415',
      }}
    >
      <p style={{ fontSize: '1.1rem', maxWidth: 400, margin: '0 auto 1rem' }}>
        You have unsubscribed from checkout reminder emails.
      </p>
      <p style={{ fontSize: '0.9rem', color: '#5c4a32', margin: '0 0 1.5rem' }}>
        This does not affect order confirmation or payment emails.
      </p>
      <Link href="/en" style={{ color: '#967a4d', fontWeight: 600 }}>
        Back to Lanna Bloom
      </Link>
    </div>
  );
}
