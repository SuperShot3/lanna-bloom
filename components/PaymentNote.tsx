'use client';

import { translations } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';

export type PaymentNoteVariant = 'cart' | 'success' | 'footer';

export function PaymentNote({
  lang,
  variant,
}: {
  lang: Locale;
  variant: PaymentNoteVariant;
}) {
  const text = translations[lang].payment[variant];
  return (
    <p className={`payment-note payment-note--${variant}`}>
      {text}
    </p>
  );
}
