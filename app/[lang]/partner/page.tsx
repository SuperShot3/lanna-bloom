import { redirect, notFound } from 'next/navigation';
import { isValidLocale, translations, type Locale } from '@/lib/i18n';
import { PartnerNav } from '@/components/partner/PartnerNav';
import { getPartnerSession } from '@/lib/supabase/partnerAuthServer';
import { getPartnerBySupabaseUserId } from '@/lib/sanity';
import { getBouquetsByPartnerId } from '@/lib/sanity';
import { PartnerDashboardClient } from './PartnerDashboardClient';

export default async function PartnerDashboardPage({
  params,
}: {
  params: { lang: string };
}) {
  const lang = params.lang;
  if (!isValidLocale(lang)) notFound();

  const session = await getPartnerSession();
  if (!session) {
    redirect(`/${lang}/partner/login`);
  }

  const partner = await getPartnerBySupabaseUserId(session.user.id);
  if (!partner) {
    redirect(`/${lang}/partner/login`);
  }

  const bouquets = await getBouquetsByPartnerId(partner.id);
  const t = translations[lang as Locale].partnerPortal.dashboard;
  const tBadge = translations[lang as Locale].partnerPortal.badge;

  return (
    <div className="partner-page partner-dashboard-page">
      <PartnerNav lang={lang as Locale} current="dashboard" />
      <div className="container">
        <PartnerDashboardClient
          lang={lang as Locale}
          partner={partner}
          bouquets={bouquets}
          t={t}
          tBadge={tBadge}
        />
      </div>
    </div>
  );
}
