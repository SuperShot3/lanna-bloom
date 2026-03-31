import Link from 'next/link';
import { translations, type Locale } from '@/lib/i18n';
import { SUPPORT_EMAIL } from '@/lib/siteContact';

type Props = { lang: Locale };

export function PartnerHowItWorksContent({ lang }: Props) {
  const t = translations[lang].partnerPortal.howItWorks;
  const applyHref = `/${lang}/partner/apply`;
  const mailtoHref = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(t.emailSubject)}`;

  return (
    <article className="partner-how-it-works">
      {/* ── Header ── */}
      <header className="partner-how-it-works-header">
        <p className="partner-how-it-works-kicker">Lanna Bloom × Partner</p>
        <h1 className="partner-how-it-works-h1">{t.h1}</h1>
        <div className="partner-how-it-works-cta-row">
          <Link href={applyHref} className="partner-how-it-works-btn partner-how-it-works-btn--primary">
            {t.ctaApply}
          </Link>
          <a href={mailtoHref} className="partner-how-it-works-btn partner-how-it-works-btn--secondary">
            {t.ctaEmail}
            <span className="partner-how-it-works-email">{t.emailDisplay}</span>
          </a>
        </div>
      </header>

      <div className="partner-how-it-works-body">

        {/* ── Intro paragraphs ── */}
        {t.introParagraphs.map((p, i) => (
          <p key={`intro-${i}`} className="partner-how-it-works-p">
            {p}
          </p>
        ))}

        {/* ── Goal / legal / commission notes ── */}
        <blockquote className="partner-how-it-works-goal-note">
          <p>{t.goalNote}</p>
        </blockquote>
        <p className="partner-how-it-works-p">{t.legalNote}</p>
        <p className="partner-how-it-works-p partner-how-it-works-p--muted">
          <em>{t.commissionNote}</em>
        </p>

        <hr className="partner-how-it-works-divider" />

        {/* ── Product categories table ── */}
        <section className="partner-how-it-works-section" aria-labelledby="product-categories-heading">
          <h2 id="product-categories-heading" className="partner-how-it-works-h2">
            {t.productCategoriesTitle}
          </h2>
          <p className="partner-how-it-works-p">{t.productCategoriesIntro}</p>

          <div className="partner-how-it-works-table-wrap">
            <table className="partner-how-it-works-table">
              <thead>
                <tr>
                  <th className="partner-how-it-works-table-th partner-how-it-works-table-th--cat">
                    {t.productCategoriesCatHeader}
                  </th>
                  <th className="partner-how-it-works-table-th">
                    {t.productCategoriesExHeader}
                  </th>
                </tr>
              </thead>
              <tbody>
                {t.productCategoriesTable.map((row) => (
                  <tr key={row.category} className="partner-how-it-works-table-row">
                    <td className="partner-how-it-works-table-td partner-how-it-works-table-td--cat">
                      <span className="partner-how-it-works-table-icon">{row.icon}</span>
                      {row.category}
                    </td>
                    <td className="partner-how-it-works-table-td">{row.examples}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <hr className="partner-how-it-works-divider" />

        {/* ── Items that work especially well with flowers ── */}
        <section className="partner-how-it-works-section" aria-labelledby="with-flowers-heading">
          <h2 id="with-flowers-heading" className="partner-how-it-works-h2">
            {t.withFlowersTitle}
          </h2>
          <p className="partner-how-it-works-p">{t.withFlowersIntro}</p>
          <ul className="partner-how-it-works-list partner-how-it-works-list--emoji">
            {t.withFlowersList.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <hr className="partner-how-it-works-divider" />

        {/* ── Seller types ── */}
        <section className="partner-how-it-works-section" aria-labelledby="seller-types-heading">
          <h2 id="seller-types-heading" className="partner-how-it-works-h2">
            {t.sellerTypesTitle}
          </h2>
          <p className="partner-how-it-works-p">{t.sellerTypesIntro}</p>
          <ul className="partner-how-it-works-list">
            {t.sellerTypesList.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <hr className="partner-how-it-works-divider" />

        {/* ── Who can partner ── */}
        <section className="partner-how-it-works-short" aria-labelledby="who-can-heading">
          <h2 id="who-can-heading" className="partner-how-it-works-h2">
            {t.whoCanTitle}
          </h2>
          {t.whoCanParagraphs.map((p, i) => (
            <p key={`who-${i}`} className="partner-how-it-works-p">
              {p}
            </p>
          ))}
          <blockquote className="partner-how-it-works-callout">
            {t.whoCanCallout.split('\n').map((line, i) => (
              <p key={i}>{line}</p>
            ))}
          </blockquote>
        </section>

        {/* ── Bottom CTA ── */}
        <div className="partner-how-it-works-cta-row partner-how-it-works-cta-row--bottom">
          <Link href={applyHref} className="partner-how-it-works-btn partner-how-it-works-btn--primary">
            {t.ctaApply}
          </Link>
          <a href={mailtoHref} className="partner-how-it-works-btn partner-how-it-works-btn--secondary">
            {t.ctaEmail}
            <span className="partner-how-it-works-email">{t.emailDisplay}</span>
          </a>
        </div>

        {/* ── Footer note ── */}
        <p className="partner-how-it-works-footer-note">
          <em>{t.footerNote}</em>
        </p>
      </div>
    </article>
  );
}
