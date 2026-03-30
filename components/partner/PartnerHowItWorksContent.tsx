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
        {t.introParagraphs.map((p, i) => (
          <p key={`intro-${i}`} className="partner-how-it-works-p">
            {p}
          </p>
        ))}

        <section className="partner-how-it-works-section" aria-labelledby="more-ideas-heading">
          <h2 id="more-ideas-heading" className="partner-how-it-works-h2">
            {t.moreIdeasTitle}
          </h2>
          <p className="partner-how-it-works-p">{t.moreIdeasIntro}</p>
          <ul className="partner-how-it-works-list">
            {t.moreIdeasList.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className="partner-how-it-works-section" aria-labelledby="with-flowers-heading">
          <h2 id="with-flowers-heading" className="partner-how-it-works-h2">
            {t.withFlowersTitle}
          </h2>
          <ul className="partner-how-it-works-list">
            {t.withFlowersList.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

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

        <section className="partner-how-it-works-short" aria-labelledby="who-can-heading">
          <h2 id="who-can-heading" className="partner-how-it-works-h2">
            {t.whoCanTitle}
          </h2>
          {t.whoCanParagraphs.map((p, i) => (
            <p key={`who-${i}`} className="partner-how-it-works-p">
              {p}
            </p>
          ))}
        </section>

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
