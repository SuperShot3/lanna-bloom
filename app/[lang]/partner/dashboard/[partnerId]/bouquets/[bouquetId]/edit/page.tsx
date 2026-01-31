import { notFound } from 'next/navigation';
import { getPartnerById, getBouquetById } from '@/lib/sanity';
import { isValidLocale, type Locale } from '@/lib/i18n';
import { translations } from '@/lib/i18n';
import { BouquetForm } from '../../BouquetForm';
import { updateBouquetAction } from '../../actions';

export default async function PartnerBouquetEditPage({
  params,
}: {
  params: { lang: string; partnerId: string; bouquetId: string };
}) {
  const lang = params.lang;
  if (!isValidLocale(lang)) notFound();
  const partner = await getPartnerById(params.partnerId);
  if (!partner || partner.status !== 'approved') notFound();
  const bouquet = await getBouquetById(params.bouquetId);
  if (!bouquet || bouquet.partnerId !== partner.id) notFound();

  const t = translations[lang as Locale].partner;
  const dashboardHref = `/${lang}/partner/dashboard/${partner.id}`;

  return (
    <div className="partner-page">
      <div className="container">
        <h1 className="partner-title">{t.editBouquet}</h1>
        <p className="partner-subline">{lang === 'th' ? bouquet.nameTh || bouquet.nameEn : bouquet.nameEn}</p>
        <BouquetForm
          lang={lang as Locale}
          partnerId={partner.id}
          bouquetId={bouquet.id}
          initial={{
            nameEn: bouquet.nameEn,
            nameTh: bouquet.nameTh,
            descriptionEn: bouquet.descriptionEn,
            descriptionTh: bouquet.descriptionTh,
            compositionEn: bouquet.compositionEn,
            compositionTh: bouquet.compositionTh,
            category: bouquet.category,
            sizes: bouquet.sizes.map((s) => ({
              ...s,
              preparationTime: s.preparationTime,
              availability: s.availability,
            })),
          }}
          action={updateBouquetAction}
          submitLabel={t.saveDraft}
          backHref={dashboardHref}
          backLabel={t.backToDashboard}
        />
      </div>
    </div>
  );
}
