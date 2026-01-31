import Link from 'next/link';
import { notFound } from 'next/navigation';
import { isValidLocale, type Locale } from '@/lib/i18n';
import { translations } from '@/lib/i18n';

export default async function PartnerRegisterSuccessPage({
  params,
  searchParams,
}: {
  params: { lang: string };
  searchParams: { id?: string };
}) {
  const lang = params.lang;
  if (!isValidLocale(lang)) notFound();
  const partnerId = searchParams.id;
  const t = translations[lang as Locale].partner;
  const dashboardHref = partnerId
    ? `/${lang}/partner/dashboard/${partnerId}`
    : null;

  return (
    <div className="partner-page">
      <div className="container">
        <div className="partner-success-box">
          <h1 className="partner-success-title">{t.successTitle}</h1>
          <p className="partner-success-message">{t.successMessage}</p>
          {dashboardHref && (
            <p>
              <strong>{t.dashboardLink}:</strong>{' '}
              <Link href={dashboardHref} className="partner-dashboard-link">
                {dashboardHref}
              </Link>
              <br />
              <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                Save this link — it will work after we approve your account.
              </span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
