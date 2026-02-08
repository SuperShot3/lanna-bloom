'use client';

import Link from 'next/link';
import { translations } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';

export function RefundReplacementClient({ lang }: { lang: Locale }) {
  const t = translations[lang].refundPolicy;
  const tNav = translations[lang].nav;

  return (
    <div className="policy-page">
      <div className="container">
        <h1 className="policy-title">{t.title}</h1>
        <p className="policy-last-updated">{t.lastUpdated}</p>
        <p className="policy-intro">{t.intro}</p>

        <section className="policy-section">
          <h2 className="policy-heading">{t.eligibleTitle}</h2>
          <p className="policy-text">{t.eligibleIntro}</p>
          <ul className="policy-list">
            <li>{t.eligibleList1}</li>
            <li>{t.eligibleList2}</li>
          </ul>
          <p className="policy-text">{t.eligibleOutro}</p>
          <ul className="policy-list">
            <li>{t.eligibleOption1}</li>
            <li>{t.eligibleOption2}</li>
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
          </ul>
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
          <h2 className="policy-heading">{t.howToContactTitle}</h2>
          <p className="policy-text">{t.howToContact}</p>
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
        .policy-list {
          margin: 8px 0 14px;
          padding-left: 1.25rem;
          color: var(--text);
          line-height: 1.6;
        }
        .policy-list li {
          margin-bottom: 6px;
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
