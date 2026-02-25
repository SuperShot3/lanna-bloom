'use client';

import Link from 'next/link';
import { translations } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';
import { MessengerLinks } from './MessengerLinks';
import { PaymentBadges } from './PaymentBadges';
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
        <div className="footer-messenger">
          <SocialLinks />
          <MessengerLinks />
        </div>
        <div className="footer-payments-row">
          <div className="footer-payments-spacer" aria-hidden="true" />
          <div className="footer-payments-wrap">
            <PaymentBadges lang={lang} />
          </div>
          <div className="footer-dbd-spacer">
            <div className="footer-dbd-badge">
              <span className="footer-dbd-container">
                <img
                  src="https://dbdregistered.dbd.go.th/api/public/banner?param=867714DAF3E4ED6944FA5672C4E6D1C4A2114631CF57F4DB847153673BC31A6B"
                  alt="DBD Verified badge (Thailand Department of Business Development)"
                  className="footer-dbd-img"
                  loading="lazy"
                  decoding="async"
                  width={76}
                  height={76}
                />
              </span>
              <span className="footer-dbd-label">{t.dbdVerified ?? 'DBD Verified'}</span>
            </div>
          </div>
        </div>
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
        .footer-payments-row {
          display: flex;
          flex-wrap: nowrap;
          justify-content: center;
          align-items: center;
          width: 100%;
          gap: 20px;
        }
        .footer-payments-spacer {
          flex: 1;
          min-width: 0;
        }
        .footer-payments-wrap {
          flex: 0 0 auto;
          width: fit-content;
        }
        .footer-dbd-spacer {
          flex: 1;
          display: flex;
          justify-content: flex-end;
          align-items: center;
          min-width: 0;
        }
        .footer-dbd-badge {
          flex: 0 0 auto;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }
        .footer-dbd-container {
          display: inline-flex;
          background: #fff;
          border-radius: 8px;
          padding: 4px;
          box-shadow: var(--shadow);
        }
        .footer-dbd-img {
          width: 56px;
          height: 56px;
          object-fit: contain;
          display: block;
        }
        @media (min-width: 640px) {
          .footer-dbd-img {
            width: 64px;
            height: 64px;
          }
        }
        @media (min-width: 1024px) {
          .footer-dbd-img {
            width: 76px;
            height: 76px;
          }
        }
        .footer-dbd-label {
          font-size: 0.7rem;
          color: var(--text-muted);
          opacity: 0.9;
        }
      `}</style>
    </footer>
  );
}
