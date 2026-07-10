import { Suspense } from 'react';
import type { Metadata } from 'next';
import { isValidLocale, type Locale } from '@/lib/i18n';
import { OrderThankYouClient } from '@/components/checkout/OrderThankYouClient';

export const metadata: Metadata = {
  title: 'Order confirmation | Lanna Bloom',
  robots: { index: false, follow: false },
};

function resolveLang(langParam: string | undefined): Locale {
  const raw = langParam?.trim().toLowerCase() ?? '';
  return isValidLocale(raw) ? raw : 'en';
}

export default function LannaOrderThankYouPage({
  searchParams,
}: {
  searchParams: { lang?: string; session_id?: string };
}) {
  const lang = resolveLang(searchParams.lang);

  return (
    <Suspense
      fallback={
        <div style={{ minHeight: '40vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          Loading…
        </div>
      }
    >
      <OrderThankYouClient lang={lang} />
    </Suspense>
  );
}
