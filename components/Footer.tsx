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
        <div className="footer-main">
          <div className="footer-block footer-social">
            <SocialLinks />
            <MessengerLinks />
          </div>
          <nav className="footer-block footer-nav" aria-label="Footer">
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
          <div className="footer-block footer-images">
            <div className="footer-payments-wrap">
              <PaymentBadges lang={lang} compact />
            </div>
            <span className="footer-dbd-container">
              <img
                src="https://dbdregistered.dbd.go.th/api/public/banner?param=867714DAF3E4ED6944FA5672C4E6D1C4A2114631CF57F4DB847153673BC31A6B"
                alt="DBD Verified (Thailand Department of Business Development)"
                className="footer-dbd-img"
                loading="lazy"
                decoding="async"
                width={40}
                height={40}
              />
            </span>
          </div>
        </div>
        <p className="footer-copy">© Lanna Bloom</p>
      </div>
      <style jsx>{`
        .footer {
          margin-top: auto;
          padding: 16px 0;
          border-top: 1px solid var(--border);
          background: var(--surface);
        }
        .footer-inner {
          display: flex;
          flex-direction: column;
          align-items: stretch;
          gap: 12px;
        }
        .footer-main {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 16px 24px;
        }
        .footer-social {
          flex: 1;
          justify-content: flex-start;
        }
        .footer-block {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .footer-nav {
          flex: 0 0 auto;
          justify-content: center;
          flex-wrap: wrap;
          gap: 12px 20px;
        }
        .footer-images {
          flex: 1;
          justify-content: flex-end;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .footer-dbd-container {
          display: inline-flex;
          background: #fff;
          border-radius: 6px;
          padding: 4px;
          box-shadow: var(--shadow);
        }
        .footer-dbd-img {
          width: 40px;
          height: 40px;
          object-fit: contain;
          display: block;
        }
        .footer-link {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text);
          text-decoration: none;
          transition: color 0.2s;
        }
        .footer-link:hover {
          color: var(--accent);
        }
        .footer-copy {
          font-size: 0.8rem;
          color: var(--text-muted);
          margin: 0;
          text-align: center;
          padding-top: 4px;
          border-top: 1px solid var(--border);
        }
        @media (max-width: 767px) {
          .footer-main {
            flex-direction: column;
            justify-content: center;
          }
          .footer-social,
          .footer-images {
            flex: none;
            justify-content: center;
          }
        }
        @media (min-width: 768px) {
          .footer {
            padding: 14px 0;
          }
        }
      `}</style>
    </footer>
  );
}
