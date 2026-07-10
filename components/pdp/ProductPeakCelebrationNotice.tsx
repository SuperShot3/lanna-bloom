'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Locale } from '@/lib/i18n';
import { translations } from '@/lib/i18n';
import { formatPeakCelebrationTemplate } from '@/lib/promo/peakCelebrationMessages';
import { getActivePeakCelebrationNotice } from '@/lib/promo/peakCelebrationPricing';

export function ProductPeakCelebrationNotice({ lang }: { lang: Locale }) {
  const [mounted, setMounted] = useState(false);
  const [rule, setRule] = useState<ReturnType<typeof getActivePeakCelebrationNotice>>(null);

  useEffect(() => {
    setMounted(true);
    setRule(getActivePeakCelebrationNotice());
    const id = window.setInterval(() => setRule(getActivePeakCelebrationNotice()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  if (!mounted || !rule) return null;

  const copy = translations[lang].peakCelebration ?? translations.en.peakCelebration;
  const message = formatPeakCelebrationTemplate(lang, copy.pdpNotice, rule);

  return (
    <p className="pdp-peak-notice" role="status">
      {message}{' '}
      <Link href={`/${lang}/info/delivery-policy#peak-celebration-pricing`}>{copy.policyLinkLabel}</Link>
      <style jsx>{`
        .pdp-peak-notice {
          margin: 0 0 14px;
          padding: 10px 12px;
          border-radius: 10px;
          font-size: 13px;
          line-height: 1.45;
          color: var(--text);
          background: color-mix(in srgb, #5c4a1f 8%, #fff);
          border: 1px solid color-mix(in srgb, #5c4a1f 20%, var(--border));
        }
        .pdp-peak-notice :global(a) {
          font-weight: 600;
          color: color-mix(in srgb, #5c4a1f 85%, var(--primary));
          text-decoration: underline;
          text-underline-offset: 2px;
        }
      `}</style>
    </p>
  );
}
