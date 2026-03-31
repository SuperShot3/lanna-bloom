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

      {/* ══════════════════════════════════
          HEADER
      ══════════════════════════════════ */}
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

        {/* ══════════════════════════════════
            INTRO
        ══════════════════════════════════ */}
        {t.introParagraphs.map((p, i) => (
          <p key={`intro-${i}`} className="partner-how-it-works-p">{p}</p>
        ))}

        <blockquote className="partner-how-it-works-goal-note">
          <p>{t.goalNote}</p>
        </blockquote>

        <p className="partner-how-it-works-p">{t.legalNote}</p>
        <p className="partner-how-it-works-p partner-how-it-works-p--muted">
          <em>{t.commissionNote}</em>
        </p>

        <hr className="partner-how-it-works-divider" />

        {/* ══════════════════════════════════
            WHY PARTNER (NEW)
        ══════════════════════════════════ */}
        <section className="partner-how-it-works-section" aria-labelledby="why-partner-heading">
          <h2 id="why-partner-heading" className="partner-how-it-works-h2">
            {t.whyPartnerTitle}
          </h2>
          <p className="partner-how-it-works-p">{t.whyPartnerIntro}</p>
          <ul className="partner-how-it-works-list">
            {t.whyPartnerList.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className="partner-how-it-works-p partner-how-it-works-p--closing">
            {t.whyPartnerClosing}
          </p>
        </section>

        <hr className="partner-how-it-works-divider" />

        {/* ══════════════════════════════════
            SIMPLE ONBOARDING (NEW)
        ══════════════════════════════════ */}
        <section className="partner-how-it-works-section" aria-labelledby="onboarding-heading">
          <h2 id="onboarding-heading" className="partner-how-it-works-h2">
            {t.onboardingTitle}
          </h2>
          <p className="partner-how-it-works-p">{t.onboardingIntro}</p>
          <p className="partner-how-it-works-p">{t.onboardingSubIntro}</p>
          <p className="partner-how-it-works-list-label">
            {lang === 'th' ? 'กระบวนการเริ่มต้นอาจรวมถึง:' : 'The onboarding process may include:'}
          </p>
          <ul className="partner-how-it-works-list">
            {t.onboardingList.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className="partner-how-it-works-p partner-how-it-works-p--muted">
            {t.onboardingSupportNote}
          </p>
        </section>

        <hr className="partner-how-it-works-divider" />

        {/* ══════════════════════════════════
            BASIC LISTING REQUIREMENTS (NEW)
        ══════════════════════════════════ */}
        <section className="partner-how-it-works-section" aria-labelledby="listing-req-heading">
          <h2 id="listing-req-heading" className="partner-how-it-works-h2">
            {t.listingReqTitle}
          </h2>
          <p className="partner-how-it-works-p">{t.listingReqIntro}</p>
          <ul className="partner-how-it-works-list">
            {t.listingReqList.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className="partner-how-it-works-p partner-how-it-works-p--note">
            {t.listingReqNote}
          </p>
        </section>

        <hr className="partner-how-it-works-divider" />

        {/* ══════════════════════════════════
            PRODUCT SUITABILITY FOR DELIVERY (NEW)
        ══════════════════════════════════ */}
        <section className="partner-how-it-works-section" aria-labelledby="delivery-suit-heading">
          <h2 id="delivery-suit-heading" className="partner-how-it-works-h2">
            {t.deliverySuitabilityTitle}
          </h2>
          {t.deliverySuitabilityParagraphs.map((p, i) => (
            <p key={`delivery-${i}`} className="partner-how-it-works-p">{p}</p>
          ))}
        </section>

        <hr className="partner-how-it-works-divider" />

        {/* ══════════════════════════════════
            PRODUCT IMAGE QUALITY (NEW)
        ══════════════════════════════════ */}
        <section className="partner-how-it-works-section" aria-labelledby="image-quality-heading">
          <h2 id="image-quality-heading" className="partner-how-it-works-h2">
            {t.imageQualityTitle}
          </h2>
          <p className="partner-how-it-works-p">{t.imageQualityIntro}</p>
          <p className="partner-how-it-works-p">{t.imageQualitySubIntro}</p>
          <p className="partner-how-it-works-list-label">{t.imageQualityNoteLabel}</p>
          <ul className="partner-how-it-works-list">
            {t.imageQualityList.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className="partner-how-it-works-tip">
            💡 {t.imageQualityTip}
          </p>
        </section>

        <hr className="partner-how-it-works-divider" />

        {/* ══════════════════════════════════
            SUPPORT FOR EARLY PARTNERS (NEW)
        ══════════════════════════════════ */}
        <section className="partner-how-it-works-section" aria-labelledby="early-partners-heading">
          <h2 id="early-partners-heading" className="partner-how-it-works-h2">
            {t.earlyPartnersTitle}
          </h2>
          <p className="partner-how-it-works-p">{t.earlyPartnersIntro}</p>
          <ul className="partner-how-it-works-list">
            {t.earlyPartnersList.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className="partner-how-it-works-p partner-how-it-works-p--closing">
            {t.earlyPartnersClosing}
          </p>
        </section>

        <hr className="partner-how-it-works-divider" />

        {/* ══════════════════════════════════
            PRODUCT CATEGORIES TABLE
        ══════════════════════════════════ */}
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

        {/* ══════════════════════════════════
            ITEMS THAT WORK WELL WITH FLOWERS
        ══════════════════════════════════ */}
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

        {/* ══════════════════════════════════
            LOCAL SELLER TYPES
        ══════════════════════════════════ */}
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

        {/* ══════════════════════════════════
            WHO CAN PARTNER (expanded)
        ══════════════════════════════════ */}
        <section className="partner-how-it-works-short" aria-labelledby="who-can-heading">
          <h2 id="who-can-heading" className="partner-how-it-works-h2">
            {t.whoCanTitle}
          </h2>
          {t.whoCanParagraphs.map((p, i) => (
            <p key={`who-${i}`} className="partner-how-it-works-p">{p}</p>
          ))}
          <p className="partner-how-it-works-list-label">{t.whoCanBulletIntro}</p>
          <ul className="partner-how-it-works-list partner-how-it-works-list--two-col">
            {t.whoCanList.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <blockquote className="partner-how-it-works-callout">
            {t.whoCanCallout.split('\n').map((line, i) => (
              <p key={i}>{line}</p>
            ))}
          </blockquote>
        </section>

        <hr className="partner-how-it-works-divider" />

        {/* ══════════════════════════════════
            APPLY CTA SECTION (NEW)
        ══════════════════════════════════ */}
        <section className="partner-how-it-works-apply-cta" aria-labelledby="apply-cta-heading">
          <h2 id="apply-cta-heading" className="partner-how-it-works-h2">
            {t.applyCtaTitle}
          </h2>
          <p className="partner-how-it-works-p">{t.applyCtaIntro}</p>
          <p className="partner-how-it-works-p partner-how-it-works-p--muted">
            {t.applyCtaPortalLabel}
          </p>
          <Link href={applyHref} className="partner-how-it-works-apply-url">
            www.lannabloom.shop{applyHref}
          </Link>
          <p className="partner-how-it-works-apply-closing">{t.applyCtaClosing}</p>
        </section>

        {/* ══════════════════════════════════
            BOTTOM CTA BUTTONS
        ══════════════════════════════════ */}
        <div className="partner-how-it-works-cta-row partner-how-it-works-cta-row--bottom">
          <Link href={applyHref} className="partner-how-it-works-btn partner-how-it-works-btn--primary">
            {t.ctaApply}
          </Link>
          <a href={mailtoHref} className="partner-how-it-works-btn partner-how-it-works-btn--secondary">
            {t.ctaEmail}
            <span className="partner-how-it-works-email">{t.emailDisplay}</span>
          </a>
        </div>

      </div>
    </article>
  );
}
