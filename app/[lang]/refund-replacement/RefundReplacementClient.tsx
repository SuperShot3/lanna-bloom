'use client';

import Link from 'next/link';
import {
  getLineContactUrl,
  getWhatsAppContactUrl,
  getTelegramContactUrl,
} from '@/lib/messenger';
import { translations } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';

const AMERICAN_EXPRESS_URL = 'https://www.americanexpress.com/en-us/help/refunds.html';
const STRIPE_SUPPORT_URL = 'https://support.stripe.com/questions/refund-processing-fees';

export function RefundReplacementClient({ lang }: { lang: Locale }) {
  const t = translations[lang].refundPolicy;
  const tNav = translations[lang].nav;

  const contactLinks = [
    { label: t.contactOnLine, href: getLineContactUrl() },
    { label: t.contactOnWhatsApp, href: getWhatsAppContactUrl() },
    { label: t.contactOnTelegram, href: getTelegramContactUrl() },
  ];

  return (
    <div className="policy-page">
      <div className="container">
        <h1 className="policy-title">{t.title}</h1>
        <p className="policy-last-updated">{t.lastUpdated}</p>
        <p className="policy-intro">{t.intro}</p>

        <section className="policy-section">
          <h2 className="policy-heading">{t.timeLimitTitle}</h2>
          <p className="policy-text">{t.timeLimitText}</p>
        </section>

        <section className="policy-section">
          <h2 className="policy-heading">{t.eligibleTitle}</h2>
          <p className="policy-text">{t.eligibleIntro}</p>
          <ul className="policy-list">
            <li>{t.eligibleList1}</li>
            <li>{t.eligibleList2}</li>
            <li>{t.eligibleList3}</li>
          </ul>
          <p className="policy-text">{t.eligibleOutro}</p>
          <ul className="policy-list">
            <li>{t.eligibleOption1}</li>
            <li>{t.eligibleOption2}</li>
          </ul>
          <p className="policy-text policy-note">{t.keepBouquetNote}</p>
        </section>

        <section className="policy-section">
          <h2 className="policy-heading">{t.whatToSendTitle}</h2>
          <p className="policy-text">
            {t.whatToSendIntro}{' '}
            {contactLinks.map((link, i) => (
              <span key={link.href}>
                <a
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="policy-link-inline"
                >
                  {link.label}
                </a>
                {i < contactLinks.length - 1 ? ', ' : ''}
              </span>
            ))}{' '}
            {t.whatToSendIntroSuffix}
          </p>
          <ul className="policy-list">
            <li>{t.whatToSendList1}</li>
            <li>{t.whatToSendList2}</li>
            <li>{t.whatToSendList3}</li>
            <li>{t.whatToSendList4}</li>
          </ul>
        </section>

        <section className="policy-section">
          <h2 className="policy-heading">{t.notEligibleTitle}</h2>
          <p className="policy-text">{t.notEligibleIntro}</p>
          <ul className="policy-list">
            <li>{t.notEligible1}</li>
            <li>{t.notEligible2}</li>
            <li>{t.notEligible3}</li>
            <li>{t.notEligible4}</li>
            <li>{t.notEligible5}</li>
            <li>{t.notEligible6}</li>
          </ul>
        </section>

        <section className="policy-section">
          <h2 className="policy-heading">{t.aiImagesTitle}</h2>
          <p className="policy-text">{t.aiImagesIntro}</p>
          <p className="policy-text">{t.aiImagesBody}</p>
          <ul className="policy-list">
            <li>{t.aiImagesList1}</li>
            <li>{t.aiImagesList2}</li>
            <li>{t.aiImagesList3}</li>
            <li>{t.aiImagesList4}</li>
          </ul>
          <p className="policy-text">{t.aiImagesOutro}</p>
        </section>

        <section className="policy-section">
          <h2 className="policy-heading">{t.substitutionsTitle}</h2>
          <p className="policy-text">{t.substitutionsIntro}</p>
          <ul className="policy-list">
            <li>{t.substitutions1}</li>
            <li>{t.substitutions2}</li>
            <li>{t.substitutions3}</li>
          </ul>
        </section>

        <section className="policy-section">
          <h2 className="policy-heading">{t.deliveryIssuesTitle}</h2>
          <p className="policy-text">{t.deliveryIssues}</p>
        </section>

        <section className="policy-section">
          <h2 className="policy-heading">{t.refundMethodTitle}</h2>
          <ul className="policy-list">
            <li>{t.refundMethod1}</li>
            <li>
              {t.refundMethod2}{' '}
              (<a
                href={AMERICAN_EXPRESS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="policy-link-inline"
              >
                {t.americanExpress}
              </a>)
            </li>
            <li>
              {t.refundMethod3}{' '}
              (<a
                href={STRIPE_SUPPORT_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="policy-link-inline"
              >
                {t.stripeSupport}
              </a>)
            </li>
            <li>{t.refundMethod4}</li>
          </ul>
        </section>

        <section className="policy-section">
          <h2 className="policy-heading">{t.howToContactTitle}</h2>
          <p className="policy-text">
            {t.howToContactIntro}{' '}
            {contactLinks.map((link, i) => (
              <span key={link.href}>
                <a
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="policy-link-inline"
                >
                  {link.label}
                </a>
                {i < contactLinks.length - 1 ? ', ' : ''}
              </span>
            ))}{' '}
            {t.howToContactOutro}
          </p>
        </section>

        <p className="policy-back">
          <Link href={`/${lang}`} className="policy-link">
            {tNav.home}
          </Link>
        </p>
      </div>
      <style jsx>{`
        .policy-page {
          padding: 32px 0 48px;
        }
        .policy-title {
          font-family: var(--font-serif);
          font-size: 1.75rem;
          font-weight: 600;
          color: var(--text);
          margin: 0 0 8px;
        }
        .policy-last-updated {
          font-size: 0.9rem;
          color: var(--text-muted);
          margin: 0 0 20px;
        }
        .policy-intro {
          font-size: 1rem;
          color: var(--text);
          margin: 0 0 28px;
          line-height: 1.6;
        }
        .policy-section {
          margin-bottom: 28px;
        }
        .policy-heading {
          font-size: 1.15rem;
          font-weight: 700;
          color: var(--text);
          margin: 0 0 12px;
        }
        .policy-text {
          font-size: 1rem;
          color: var(--text);
          margin: 0 0 10px;
          line-height: 1.6;
        }
        .policy-note {
          font-weight: 500;
          color: var(--text);
        }
        .policy-list {
          margin: 8px 0 14px;
          padding-left: 1.25rem;
          color: var(--text);
          line-height: 1.6;
        }
        .policy-list li {
          margin-bottom: 6px;
        }
        .policy-link-inline {
          font-weight: 600;
          color: var(--accent);
          text-decoration: underline;
        }
        .policy-link-inline:hover {
          color: #967a4d;
        }
        .policy-back {
          margin-top: 36px;
          padding-top: 24px;
          border-top: 1px solid var(--border);
        }
        .policy-link {
          font-weight: 600;
          color: var(--accent);
          text-decoration: underline;
        }
        .policy-link:hover {
          color: #967a4d;
        }
      `}</style>
    </div>
  );
}
