import { notFound } from 'next/navigation';
import Link from 'next/link';
import { isValidLocale, translations, type Locale } from '@/lib/i18n';
import { PartnerNav } from '@/components/partner/PartnerNav';
import { requirePartnerSession } from '@/lib/partner/requirePartnerSession';
import { getPendingCountByPartnerId } from '@/lib/sanity';
import { Card } from '@/components/partner/Card';
import { Btn } from '@/components/partner/Btn';
import { PartnerShopEditForm } from './PartnerShopEditForm';

export default async function PartnerShopEditPage({ params }: { params: { lang: string } }) {
  const lang = params.lang;
  if (!isValidLocale(lang)) notFound();

  const { partner, lang: locale } = await requirePartnerSession(lang);
  const pendingCount = await getPendingCountByPartnerId(partner.id);
  const tPartner = translations[locale].partner;
  const t = translations[locale].partnerPortal.shopEdit;

  return (
    <div className="partner-page partner-dashboard-page">
      <PartnerNav lang={locale} current="shop" pendingCount={pendingCount} isLoggedIn />
      <div className="container">
        <div className="partner-dashboard-welcome-top" style={{ marginBottom: 16 }}>
          <h1 className="partner-title">{t.title}</h1>
        </div>

        <Card>
          <PartnerShopEditForm
            lang={locale}
            partner={partner}
            labels={{
              phoneNumber: t.phoneNumber,
              lineOrWhatsapp: t.lineOrWhatsapp,
              shopAddress: t.shopAddress,
              city: t.city,
              shopBioEn: t.shopBioEn,
              shopBioTh: t.shopBioTh,
              save: t.save,
              saving: t.saving,
            }}
          />
        </Card>

        <div style={{ marginTop: 16 }}>
          <Link href={`/${locale}/partner/shop`}>
            <Btn variant="ghost">{t.back ?? tPartner.backToDashboard}</Btn>
          </Link>
        </div>
      </div>
    </div>
  );
}

