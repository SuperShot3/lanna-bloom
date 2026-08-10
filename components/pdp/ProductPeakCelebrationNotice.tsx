'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Locale } from '@/lib/i18n';
import { translations } from '@/lib/i18n';
import { formatPeakCelebrationTemplate } from '@/lib/promo/peakCelebrationMessages';
import {
  getActivePeakCelebrationNotice,
  getActivePeakCelebrationSpike,
  type PeakCelebrationRule,
} from '@/lib/promo/peakCelebrationPricing';

type NoticeMode = 'advance' | 'active';

function resolveNotice(now = new Date()): { mode: NoticeMode; rule: PeakCelebrationRule } | null {
  const spike = getActivePeakCelebrationSpike(now);
  if (spike) return { mode: 'active', rule: spike };
  const advance = getActivePeakCelebrationNotice(now);
  if (advance) return { mode: 'advance', rule: advance };
  return null;
}

export function ProductPeakCelebrationNotice({ lang }: { lang: Locale }) {
  const [mounted, setMounted] = useState(false);
  const [notice, setNotice] = useState<ReturnType<typeof resolveNotice>>(null);

  useEffect(() => {
    setMounted(true);
    setNotice(resolveNotice());
    const id = window.setInterval(() => setNotice(resolveNotice()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  if (!mounted || !notice) return null;

  const copy = translations[lang].peakCelebration ?? translations.en.peakCelebration;
  const message = formatPeakCelebrationTemplate(
    lang,
    notice.mode === 'active' ? copy.pdpNoticeActive : copy.pdpNotice,
    notice.rule
  );

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
