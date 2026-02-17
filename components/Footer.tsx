'use client';

import Link from 'next/link';
import { translations } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';
import { MessengerLinks } from './MessengerLinks';
import { PaymentNote } from './PaymentNote';
import { SocialLinks } from './SocialLinks';

export function Footer({ lang }: { lang: Locale }) {
  const t = translations[lang].nav;

  return (
    <footer className="footer">
      <div className="container footer-inner">
        <nav className="footer-nav" aria-label="Footer">
          <Link href={`/${lang}/refund-replacement`} className="footer-link">
            {t.refundReplacement}
          </Link>
          <Link href={`/${lang}/contact`} className="footer-link">
            {t.contactUs}
          </Link>
          <Link href={`/${lang}/contact#location`} className="footer-link">
            {t.findUs}
          </Link>
        </nav>
        <div className="footer-info">
          <span className="footer-info-label">{t.information}</span>
          <Link href={`/${lang}/guides/flowers-chiang-mai`} className="footer-link">
            {t.flowerDeliveryChiangMai}
          </Link>
          <Link href={`/${lang}/guides/rose-bouquets-chiang-mai`} className="footer-link">
            {t.roseBouquetsChiangMai}
          </Link>
          <Link href={`/${lang}/guides/same-day-flower-delivery-chiang-mai`} className="footer-link">
            {t.sameDayFlowerDeliveryChiangMai}
          </Link>
        </div>
        <div className="footer-messenger">
          <SocialLinks />
          <MessengerLinks />
        </div>
        <PaymentNote lang={lang} variant="footer" />
        <p className="footer-copy">© Lanna Bloom</p>
      </div>
      <style jsx>{`
        .footer {
          margin-top: auto;
          padding: 24px 0;
          border-top: 1px solid var(--border);
          background: var(--surface);
        }
        .footer-inner {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
          text-align: center;
        }
        .footer-nav {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 16px 24px;
        }
        .footer-info {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          align-items: center;
          gap: 8px 16px;
        }
        .footer-info-label {
          font-size: 0.9rem;
          font-weight: 600;
          color: var(--text-muted);
        }
        .footer-link {
          font-size: 0.95rem;
          font-weight: 600;
          color: var(--text);
          text-decoration: none;
          transition: color 0.2s;
        }
        .footer-link:hover {
          color: var(--accent);
        }
        .footer-messenger {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          align-items: center;
          gap: 12px;
        }
        .footer-copy {
          font-size: 0.85rem;
          color: var(--text-muted);
          margin: 0;
        }
      `}</style>
    </footer>
  );
}
