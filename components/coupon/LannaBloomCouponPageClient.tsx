'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Locale } from '@/lib/i18n';
import {
  LANNA_BLOOM_COUPON_CODE,
  LANNA_BLOOM_COUPON_EXPIRES_YMD,
  LANNA_BLOOM_COUPON_TIERS,
} from '@/lib/promo/lannaBloomCoupon';
import { storeReferral } from '@/lib/referral';

const COPY = {
  en: {
    title: 'Lanna Bloom coupon',
    intro:
      'Use code LANNABLOOM for a fixed discount on your flower order. The discount depends on your items subtotal (before delivery).',
    codeLabel: 'Coupon code',
    copy: 'Copy code',
    copied: 'Copied!',
    tiersTitle: 'Discount tiers',
    tierLine: '฿{amount} off orders from ฿{min}',
    minTitle: 'Minimum order',
    minBody: 'Items subtotal must be at least ฿3,000 before delivery fees.',
    expiresTitle: 'Expiration',
    expiresBody: 'Valid through {date} (Thailand time).',
    rulesTitle: 'Restrictions',
    rules: [
      'Cannot be combined with products that already have a sale discount (for example discounted rose bouquets).',
      'Cannot be combined with another coupon or automatic offer.',
      'Does not apply to delivery fees.',
      'One coupon per order.',
    ],
    shop: 'Shop flowers',
    activate: 'Activate coupon & shop',
  },
  th: {
    title: 'คูปอง Lanna Bloom',
    intro:
      'ใช้รหัส LANNABLOOM เพื่อรับส่วนลดแบบจำนวนคงที่ตามยอดสินค้า (ก่อนค่าจัดส่ง)',
    codeLabel: 'รหัสคูปอง',
    copy: 'คัดลอกรหัส',
    copied: 'คัดลอกแล้ว!',
    tiersTitle: 'ระดับส่วนลด',
    tierLine: 'ลด ฿{amount} เมื่อสั่งตั้งแต่ ฿{min}',
    minTitle: 'ยอดขั้นต่ำ',
    minBody: 'ยอดสินค้าต้องอย่างน้อย ฿3,000 ก่อนค่าจัดส่ง',
    expiresTitle: 'วันหมดอายุ',
    expiresBody: 'ใช้ได้ถึง {date} (เวลาประเทศไทย)',
    rulesTitle: 'เงื่อนไข',
    rules: [
      'ใช้ร่วมกับสินค้าที่มีส่วนลดอยู่แล้วไม่ได้ (เช่นช่อกุหลาบลดราคา)',
      'ใช้ร่วมกับคูปองหรือข้อเสนออัตโนมัติอื่นไม่ได้',
      'ไม่ลดค่าจัดส่ง',
      'ใช้ได้หนึ่งคูปองต่อคำสั่งซื้อ',
    ],
    shop: 'เลือกดอกไม้',
    activate: 'เปิดใช้คูปองและเลือกซื้อ',
  },
} as const;

export function LannaBloomCouponPageClient({ lang }: { lang: Locale }) {
  const t = lang === 'th' ? COPY.th : COPY.en;
  const [copied, setCopied] = useState(false);
  const activateHref = `/${lang}?coupon=${LANNA_BLOOM_COUPON_CODE}`;
  const shopHref = `/${lang}/catalog`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(LANNA_BLOOM_COUPON_CODE);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const handleActivate = () => {
    storeReferral(LANNA_BLOOM_COUPON_CODE);
  };

  const sortedTiers = [...LANNA_BLOOM_COUPON_TIERS].sort(
    (a, b) => a.minItemsTotal - b.minItemsTotal
  );

  return (
    <div className="lb-coupon-page">
      <header className="lb-coupon-hero">
        <p className="lb-coupon-brand">Lanna Bloom</p>
        <h1 className="lb-coupon-title">{t.title}</h1>
        <p className="lb-coupon-intro">{t.intro}</p>
      </header>

      <section className="lb-coupon-code-block" aria-labelledby="coupon-code-heading">
        <h2 id="coupon-code-heading" className="lb-coupon-h2">
          {t.codeLabel}
        </h2>
        <p className="lb-coupon-code" aria-label={LANNA_BLOOM_COUPON_CODE}>
          {LANNA_BLOOM_COUPON_CODE}
        </p>
        <div className="lb-coupon-actions">
          <button type="button" className="btn-premium" onClick={handleCopy}>
            {copied ? t.copied : t.copy}
          </button>
          <Link href={activateHref} className="hero-cta" onClick={handleActivate}>
            {t.activate}
          </Link>
          <Link href={shopHref} className="btn-pill">
            {t.shop}
          </Link>
        </div>
      </section>

      <section className="lb-coupon-section" aria-labelledby="tiers-heading">
        <h2 id="tiers-heading" className="lb-coupon-h2">
          {t.tiersTitle}
        </h2>
        <ul className="lb-coupon-list">
          {sortedTiers.map((tier) => (
            <li key={tier.minItemsTotal}>
              {t.tierLine
                .replace('{amount}', String(tier.amount))
                .replace('{min}', tier.minItemsTotal.toLocaleString())}
            </li>
          ))}
        </ul>
      </section>

      <section className="lb-coupon-section" aria-labelledby="min-heading">
        <h2 id="min-heading" className="lb-coupon-h2">
          {t.minTitle}
        </h2>
        <p>{t.minBody}</p>
      </section>

      <section className="lb-coupon-section" aria-labelledby="expires-heading">
        <h2 id="expires-heading" className="lb-coupon-h2">
          {t.expiresTitle}
        </h2>
        <p>{t.expiresBody.replace('{date}', LANNA_BLOOM_COUPON_EXPIRES_YMD)}</p>
      </section>

      <section className="lb-coupon-section" aria-labelledby="rules-heading">
        <h2 id="rules-heading" className="lb-coupon-h2">
          {t.rulesTitle}
        </h2>
        <ul className="lb-coupon-list">
          {t.rules.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>
      </section>

      <style jsx>{`
        .lb-coupon-page {
          max-width: 40rem;
          margin: 0 auto;
          padding: 2rem 1.25rem 4rem;
          background:
            radial-gradient(ellipse 80% 50% at 10% 0%, rgba(201, 169, 110, 0.12), transparent 55%),
            radial-gradient(ellipse 60% 40% at 100% 20%, rgba(45, 74, 62, 0.06), transparent 50%),
            var(--background, #faf8f5);
          min-height: 70vh;
        }
        .lb-coupon-brand {
          margin: 0 0 0.35rem;
          font-family: var(--font-display, Georgia, serif);
          font-size: clamp(1.75rem, 5vw, 2.35rem);
          font-weight: 600;
          letter-spacing: 0.02em;
          color: var(--primary, #2d4a3e);
        }
        .lb-coupon-title {
          margin: 0 0 0.75rem;
          font-size: clamp(1.15rem, 3vw, 1.35rem);
          font-weight: 600;
          color: var(--text);
        }
        .lb-coupon-intro {
          margin: 0;
          color: var(--text-muted);
          line-height: 1.55;
          font-size: 0.98rem;
        }
        .lb-coupon-hero {
          margin-bottom: 2rem;
        }
        .lb-coupon-code-block {
          margin-bottom: 2rem;
          padding-bottom: 1.5rem;
          border-bottom: 1px solid var(--border, #e5e0d8);
        }
        .lb-coupon-h2 {
          margin: 0 0 0.65rem;
          font-size: 0.95rem;
          font-weight: 700;
          color: var(--text);
        }
        .lb-coupon-code {
          margin: 0 0 1rem;
          font-size: clamp(1.5rem, 4vw, 1.85rem);
          font-weight: 700;
          letter-spacing: 0.08em;
          color: var(--accent, #c9a96e);
        }
        .lb-coupon-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 0.65rem;
          align-items: center;
        }
        .lb-coupon-section {
          margin-bottom: 1.75rem;
        }
        .lb-coupon-section p {
          margin: 0;
          color: var(--text-muted);
          line-height: 1.5;
          font-size: 0.95rem;
        }
        .lb-coupon-list {
          margin: 0;
          padding-left: 1.15rem;
          color: var(--text-muted);
          line-height: 1.55;
          font-size: 0.95rem;
        }
        .lb-coupon-list li + li {
          margin-top: 0.35rem;
        }
      `}</style>
    </div>
  );
}
