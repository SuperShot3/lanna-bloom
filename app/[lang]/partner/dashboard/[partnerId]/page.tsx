import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPartnerById, getBouquetsByPartnerId } from '@/lib/sanity';
import { isValidLocale, type Locale } from '@/lib/i18n';
import { translations } from '@/lib/i18n';

export default async function PartnerDashboardPage({
  params,
}: {
  params: { lang: string; partnerId: string };
}) {
  const lang = params.lang;
  if (!isValidLocale(lang)) notFound();
  const partner = await getPartnerById(params.partnerId);
  if (!partner) notFound();

  const t = translations[lang as Locale].partner;

  if (partner.status === 'pending_review') {
    return (
      <div className="partner-page">
        <div className="container">
          <h1 className="partner-title">{t.dashboardTitle}</h1>
          <p className="partner-subline">{t.pendingReview}</p>
        </div>
      </div>
    );
  }

  if (partner.status === 'disabled') {
    return (
      <div className="partner-page">
        <div className="container">
          <h1 className="partner-title">{t.dashboardTitle}</h1>
          <p className="partner-subline">{t.disabled}</p>
        </div>
      </div>
    );
  }

  const bouquets = await getBouquetsByPartnerId(partner.id);

  return (
    <div className="partner-page">
      <div className="container">
        <div className="partner-dashboard-header">
          <h1 className="partner-title">{t.dashboardTitle}</h1>
          <p className="partner-subline">{partner.shopName}</p>
        </div>
        <div className="partner-dashboard-actions">
          <Link
            href={`/${lang}/partner/dashboard/${partner.id}/bouquets/new`}
            className="partner-submit"
            style={{ display: 'inline-block', textDecoration: 'none', textAlign: 'center' }}
          >
            {t.addBouquet}
          </Link>
        </div>
        {bouquets.length === 0 ? (
          <p className="partner-empty">{t.noBouquets}</p>
        ) : (
          <div className="partner-dashboard-list">
            {bouquets.map((b) => (
              <div key={b.id} className="partner-bouquet-card">
                <div>
                  <Link href={`/${lang}/partner/dashboard/${partner.id}/bouquets/${b.id}/edit`}>
                    {lang === 'th' ? b.nameTh || b.nameEn : b.nameEn}
                  </Link>
                  <span className="partner-bouquet-status">
                    {' · '}
                    {b.status === 'approved' ? t.statusApproved : t.statusPending}
                  </span>
                </div>
                <Link
                  href={`/${lang}/partner/dashboard/${partner.id}/bouquets/${b.id}/edit`}
                  className="partner-dashboard-link"
                >
                  {t.editBouquet}
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
