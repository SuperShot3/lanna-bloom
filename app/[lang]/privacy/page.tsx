import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { isValidLocale, type Locale } from '@/lib/i18n';
import {
  BUSINESS_NAME,
  LAST_UPDATED,
  SUPPORT_EMAIL,
  getPrivacyCopy,
} from './privacyPolicyContent';

export async function generateMetadata({ params }: { params: { lang: string } }): Promise<Metadata> {
  if (!isValidLocale(params.lang)) return { title: 'Privacy Policy' };
  const copy = getPrivacyCopy(params.lang);
  return { title: `${copy.title} | Lanna Bloom` };
}

export default function PrivacyPage({ params }: { params: { lang: string } }) {
  const { lang } = params;
  if (!isValidLocale(lang)) notFound();
  const locale = lang as Locale;
  const copy = getPrivacyCopy(locale);
  const { sections: s } = copy;
  const mailto = `mailto:${SUPPORT_EMAIL}`;

  return (
    <div className="policy-page">
      <div className="container">
        <h1 className="policy-title">{copy.title}</h1>
        <p className="policy-last-updated">
          {copy.lastUpdatedLabel}: {LAST_UPDATED}
        </p>
        <p className="policy-intro">{copy.intro}</p>

        <section className="policy-data-summary" aria-labelledby="policy-data-summary-title">
          <h2 id="policy-data-summary-title" className="policy-data-summary-title">
            {copy.dataUse.title}
          </h2>
          <p className="policy-data-summary-intro">{copy.dataUse.intro}</p>
          <div className="policy-data-summary-table-wrap">
            <table className="policy-data-summary-table">
              <thead>
                <tr>
                  <th scope="col">{copy.dataUse.dataLabel}</th>
                  <th scope="col">{copy.dataUse.purposeLabel}</th>
                </tr>
              </thead>
              <tbody>
                {copy.dataUse.rows.map(([data, purpose]) => (
                  <tr key={data}>
                    <th scope="row">{data}</th>
                    <td>{purpose}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="policy-data-summary-sharing">{copy.dataUse.sharing}</p>
        </section>

        <section className="policy-section">
          <h2 className="policy-heading">{s.whoWeAre.heading}</h2>
          <p className="policy-text">
            {s.whoWeAre.operatedByBefore} <strong>{copy.legalName}</strong>
            {s.whoWeAre.operatedByAfter}
          </p>
          <p className="policy-text">{s.whoWeAre.contactPrompt}</p>
          <p className="policy-text">
            <strong>{s.whoWeAre.emailLabel}:</strong>{' '}
            <a href={mailto} className="policy-link-inline">
              {SUPPORT_EMAIL}
            </a>
          </p>
        </section>

        <section className="policy-section">
          <h2 className="policy-heading">{s.dataWeCollect.heading}</h2>
          <p className="policy-text">{s.dataWeCollect.intro}</p>

          <h3 className="policy-subheading">{s.dataWeCollect.customerHeading}</h3>
          <ul className="policy-list">
            {s.dataWeCollect.customerItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>

          <h3 className="policy-subheading">{s.dataWeCollect.recipientHeading}</h3>
          <p className="policy-text">{s.dataWeCollect.recipientIntro}</p>
          <ul className="policy-list">
            {s.dataWeCollect.recipientItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className="policy-text">{s.dataWeCollect.recipientNote}</p>

          <h3 className="policy-subheading">{s.dataWeCollect.orderHeading}</h3>
          <p className="policy-text">{s.dataWeCollect.orderIntro}</p>
          <ul className="policy-list">
            {s.dataWeCollect.orderItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className="policy-text">{s.dataWeCollect.orderPaymentNote}</p>

          <h3 className="policy-subheading">{s.dataWeCollect.websiteHeading}</h3>
          <p className="policy-text">{s.dataWeCollect.websiteIntro}</p>
          <ul className="policy-list">
            {s.dataWeCollect.websiteItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className="policy-section">
          <h2 className="policy-heading">{s.howWeUse.heading}</h2>
          <p className="policy-text">{s.howWeUse.intro}</p>
          <ul className="policy-list">
            {s.howWeUse.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className="policy-text">{s.howWeUse.outro}</p>
        </section>

        <section className="policy-section">
          <h2 className="policy-heading">{s.otherPeople.heading}</h2>
          {s.otherPeople.paragraphs.map((paragraph) => (
            <p key={paragraph} className="policy-text">
              {paragraph}
            </p>
          ))}
        </section>

        <section className="policy-section">
          <h2 className="policy-heading">{s.sharing.heading}</h2>
          <p className="policy-text">{s.sharing.intro}</p>
          <ul className="policy-list">
            {s.sharing.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className="policy-text">{s.sharing.example}</p>
          <p className="policy-text">{s.sharing.noSell}</p>
        </section>

        <section className="policy-section">
          <h2 className="policy-heading">{s.cookies.heading}</h2>
          <p className="policy-text">{s.cookies.essential}</p>
          <p className="policy-text">{s.cookies.optionalIntro}</p>
          <ul className="policy-list">
            {s.cookies.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className="policy-text">{s.cookies.control}</p>
          <p className="policy-text">
            {s.cookies.cookiePolicyBefore}{' '}
            <Link href={`/${locale}/cookies`} className="policy-link-inline">
              {s.cookies.cookiePolicyLabel}
            </Link>
            {s.cookies.cookiePolicyAfter}
          </p>
        </section>

        <section className="policy-section">
          <h2 className="policy-heading">{s.checkoutReminders.heading}</h2>
          {s.checkoutReminders.paragraphs.map((paragraph) => (
            <p key={paragraph} className="policy-text">
              {paragraph}
            </p>
          ))}
        </section>

        <section className="policy-section">
          <h2 className="policy-heading">{s.international.heading}</h2>
          {s.international.paragraphs.map((paragraph) => (
            <p key={paragraph} className="policy-text">
              {paragraph}
            </p>
          ))}
        </section>

        <section className="policy-section">
          <h2 className="policy-heading">{s.retention.heading}</h2>
          <p className="policy-text">{s.retention.intro}</p>
          <ul className="policy-list">
            {s.retention.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className="policy-text">{s.retention.differentPeriods}</p>
          <p className="policy-text">{s.retention.whenNoLongerNeeded}</p>
        </section>

        <section className="policy-section">
          <h2 className="policy-heading">{s.security.heading}</h2>
          {s.security.paragraphs.map((paragraph) => (
            <p key={paragraph} className="policy-text">
              {paragraph}
            </p>
          ))}
        </section>

        <section className="policy-section">
          <h2 className="policy-heading">{s.rights.heading}</h2>
          <p className="policy-text">{s.rights.intro}</p>
          <ul className="policy-list">
            {s.rights.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className="policy-text">{s.rights.withdrawal}</p>
          <p className="policy-text">
            {s.rights.requestBefore}{' '}
            <a href={mailto} className="policy-link-inline">
              {SUPPORT_EMAIL}
            </a>
            {s.rights.requestAfter}
          </p>
        </section>

        <section className="policy-section">
          <h2 className="policy-heading">{s.marketing.heading}</h2>
          {s.marketing.paragraphs.map((paragraph) => (
            <p key={paragraph} className="policy-text">
              {paragraph}
            </p>
          ))}
        </section>

        <section className="policy-section">
          <h2 className="policy-heading">{s.children.heading}</h2>
          <p className="policy-text">{s.children.text}</p>
        </section>

        <section className="policy-section">
          <h2 className="policy-heading">{s.externalLinks.heading}</h2>
          <p className="policy-text">{s.externalLinks.text}</p>
        </section>

        <section className="policy-section">
          <h2 className="policy-heading">{s.changes.heading}</h2>
          {s.changes.paragraphs.map((paragraph) => (
            <p key={paragraph} className="policy-text">
              {paragraph}
            </p>
          ))}
        </section>

        <section className="policy-section">
          <h2 className="policy-heading">{s.contact.heading}</h2>
          <p className="policy-text">{s.contact.intro}</p>
          <p className="policy-contact-block">
            <strong>{BUSINESS_NAME}</strong>
            <br />
            {s.contact.operatedByLabel}: <strong>{copy.legalName}</strong>
            <br />
            {s.contact.businessTypeLabel}: {s.contact.businessTypeValue}
            <br />
            {s.contact.emailLabel}:{' '}
            <a href={mailto} className="policy-link-inline">
              {SUPPORT_EMAIL}
            </a>
          </p>
        </section>
      </div>
    </div>
  );
}
