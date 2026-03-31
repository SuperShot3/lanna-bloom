import { redirect, notFound } from 'next/navigation';
import { isValidLocale, translations, type Locale } from '@/lib/i18n';
import { PartnerNav } from '@/components/partner/PartnerNav';
import { getPartnerSession } from '@/lib/supabase/partnerAuthServer';
import { getPartnerBySupabaseUserId, getPendingCountByPartnerId } from '@/lib/sanity';
import { PartnerShopInfoClient } from './PartnerShopInfoClient';

export default async function PartnerShopInfoPage({ params }: { params: { lang: string } }) {
  const lang = params.lang;
  if (!isValidLocale(lang)) notFound();

  const session = await getPartnerSession();
  if (!session) redirect(`/${lang}/partner/login`);

  const partner = await getPartnerBySupabaseUserId(session.user.id);
  if (!partner) redirect(`/${lang}/partner/login`);

  const pendingCount = await getPendingCountByPartnerId(partner.id);
  const t = translations[lang as Locale].partnerPortal.dashboard;

  return (
    <div className="partner-page partner-dashboard-page">
      <PartnerNav lang={lang as Locale} current="shop" pendingCount={pendingCount} isLoggedIn />
      <div className="container">
        <PartnerShopInfoClient
          lang={lang as Locale}
          partner={partner}
          t={{
            shopInfo: t.shopInfo,
            edit: t.editProfile,
            shopNameLabel: lang === 'th' ? 'ชื่อร้าน' : 'Shop name',
            contactNameLabel: lang === 'th' ? 'ผู้ติดต่อ' : 'Contact',
            bioLabel: lang === 'th' ? 'แนะนำร้าน' : 'Shop bio',
            addressLabel: lang === 'th' ? 'ที่อยู่' : 'Address',
            phoneLabel: lang === 'th' ? 'โทร' : 'Phone',
            lineLabel: 'LINE ID',
            copyLine: t.copyLine,
            call: t.call,
            openMaps: t.openMaps,
          }}
        />
      </div>
    </div>
  );
}

