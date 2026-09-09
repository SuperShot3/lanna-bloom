import Link from 'next/link';
import { headers } from 'next/headers';
import { confirmProductReviewByToken } from '@/lib/productReviews';
import { isValidLocale, translations, type Locale } from '@/lib/i18n';
import { checkProductReviewConfirmRateLimit } from '@/lib/rateLimit';

type Props = { searchParams: Promise<{ token?: string; lang?: string }> };

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Confirm review | Lanna Bloom',
  robots: { index: false, follow: false },
};

function localeFrom(raw: string | undefined): Locale {
  return raw && isValidLocale(raw) ? raw : 'en';
}

function clientIpFromHeaders(h: Headers): string {
  return h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || '127.0.0.1';
}

export default async function ProductReviewConfirmPage({ searchParams }: Props) {
  const params = await searchParams;
  const lang = localeFrom(params.lang);
  const t = translations[lang].product;
  const token = (params.token ?? '').trim();
  const ip = clientIpFromHeaders(await headers());

  const wrap = (message: string) => (
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
      <p style={{ fontSize: '1.1rem', maxWidth: 440, margin: '0 auto 1.5rem' }}>{message}</p>
      <Link href={`/${lang}`} style={{ color: '#967a4d', fontWeight: 600 }}>
        {t.reviewConfirmHome ?? 'Back to Lanna Bloom'}
      </Link>
    </div>
  );

  if (!token) {
    return wrap(t.reviewConfirmInvalid ?? 'This link is invalid or has expired.');
  }

  if (!checkProductReviewConfirmRateLimit(ip)) {
    return wrap(t.reviewError ?? 'Too many requests. Please try again later.');
  }

  const result = await confirmProductReviewByToken(token);
  if (!result.ok) {
    return wrap(t.reviewConfirmInvalid ?? 'This link is invalid or has expired.');
  }

  const successLang = localeFrom(result.locale ?? lang);
  const successT = translations[successLang].product;
  const homeLang = successLang;
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
      <p style={{ fontSize: '1.1rem', maxWidth: 440, margin: '0 auto 1.5rem' }}>
        {successT.reviewConfirmSuccess ??
          'Thank you. Your review is confirmed and will appear after approval.'}
      </p>
      <Link href={`/${homeLang}`} style={{ color: '#967a4d', fontWeight: 600 }}>
        {successT.reviewConfirmHome ?? 'Back to Lanna Bloom'}
      </Link>
    </div>
  );
}
