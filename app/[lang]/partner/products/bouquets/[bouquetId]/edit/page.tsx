import { redirect, notFound } from 'next/navigation';
import { isValidLocale, translations, type Locale } from '@/lib/i18n';
import { PartnerNav } from '@/components/partner/PartnerNav';
import { getPartnerSession } from '@/lib/supabase/partnerAuthServer';
import { getPartnerBySupabaseUserId, getBouquetById, getPendingCountByPartnerId } from '@/lib/sanity';
import { BouquetForm } from '@/app/[lang]/partner/dashboard/[partnerId]/bouquets/BouquetForm';
import { updateBouquetAction } from '../../../actions';

export default async function PartnerBouquetEditPage({
  params,
}: {
  params: { lang: string; bouquetId: string };
}) {
  const lang = params.lang;
  if (!isValidLocale(lang)) notFound();

  const session = await getPartnerSession();
  if (!session) redirect(`/${lang}/partner/login`);

  const partner = await getPartnerBySupabaseUserId(session.user.id);
  if (!partner) redirect(`/${lang}/partner/login`);

  const bouquet = await getBouquetById(params.bouquetId);
  if (!bouquet || bouquet.partnerId !== partner.id) notFound();

  const pendingCount = await getPendingCountByPartnerId(partner.id);
  const t = translations[lang as Locale].partner;
  const productsHref = `/${lang}/partner/products`;

  return (
    <div className="partner-page partner-dashboard-page">
      <PartnerNav lang={lang as Locale} current="products" pendingCount={pendingCount} isLoggedIn />
      <div className="container">
        <h1 className="partner-title">{t.editBouquet}</h1>
        <p className="partner-subline" style={{ marginBottom: 16 }}>
          {lang === 'th' ? bouquet.nameTh || bouquet.nameEn : bouquet.nameEn}
        </p>
        <p style={{ fontSize: 14, color: 'var(--color-muted)', marginBottom: 16 }}>
          {lang === 'th'
            ? 'การแก้ไขจะถูกส่งเพื่อตรวจสอบก่อนนำไปใช้'
            : 'Changes will be submitted for approval before going live.'}
        </p>
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
            colors: bouquet.colors,
            flowerTypes: bouquet.flowerTypes,
            occasion: bouquet.occasion,
            presentationFormats: bouquet.presentationFormats,
            sizes: bouquet.sizes.map((s) => ({
              ...s,
              preparationTime: s.preparationTime,
              availability: s.availability,
            })),
          }}
          action={updateBouquetAction}
          submitLabel={t.saveDraft}
          backHref={productsHref}
          backLabel={lang === 'th' ? 'กลับรายการสินค้า' : 'Back to products'}
        />
      </div>
    </div>
  );
}
