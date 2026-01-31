import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPartnerById } from '@/lib/sanity';
import { isValidLocale, type Locale } from '@/lib/i18n';
import { translations } from '@/lib/i18n';
import { BouquetForm } from '../BouquetForm';
import { createBouquetAction } from '../actions';

export default async function PartnerBouquetNewPage({
  params,
}: {
  params: { lang: string; partnerId: string };
}) {
  const lang = params.lang;
  if (!isValidLocale(lang)) notFound();
  const partner = await getPartnerById(params.partnerId);
  if (!partner || partner.status !== 'approved') notFound();

  const t = translations[lang as Locale].partner;
  const dashboardHref = `/${lang}/partner/dashboard/${partner.id}`;

  return (
    <div className="partner-page">
      <div className="container">
        <h1 className="partner-title">{t.addBouquet}</h1>
        <p className="partner-subline">{t.saveDraft}</p>
        <BouquetForm
          lang={lang as Locale}
          partnerId={partner.id}
          action={createBouquetAction}
          submitLabel={t.saveDraft}
          backHref={dashboardHref}
          backLabel={t.backToDashboard}
        />
      </div>
    </div>
  );
}
