import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { isValidLocale, type Locale } from '@/lib/i18n';
import { CheckoutCompleteClient } from './CheckoutCompleteClient';

export default function CheckoutCompletePage({ params }: { params: { lang: string } }) {
  const lang = params.lang;
  if (!isValidLocale(lang)) notFound();

  return (
    <Suspense
      fallback={
        <div style={{ minHeight: '40vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          Loading…
        </div>
      }
    >
      <CheckoutCompleteClient lang={lang as Locale} />
    </Suspense>
  );
}
