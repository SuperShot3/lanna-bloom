import { redirect, notFound } from 'next/navigation';
import { isValidLocale, translations, type Locale } from '@/lib/i18n';
import { PartnerNav } from '@/components/partner/PartnerNav';
import { getPartnerSession } from '@/lib/supabase/partnerAuthServer';
import { getPartnerBySupabaseUserId, getProductById, getPendingCountByPartnerId } from '@/lib/sanity';
import { ProductEditForm } from './ProductEditForm';

export default async function PartnerProductEditPage({
  params,
}: {
  params: { lang: string; productId: string };
}) {
  const lang = params.lang;
  if (!isValidLocale(lang)) notFound();

  const session = await getPartnerSession();
  if (!session) redirect(`/${lang}/partner/login`);

  const partner = await getPartnerBySupabaseUserId(session.user.id);
  if (!partner) redirect(`/${lang}/partner/login`);

  const product = await getProductById(params.productId);
  if (!product || product.partnerId !== partner.id) notFound();

  const pendingCount = await getPendingCountByPartnerId(partner.id);
  const t = translations[lang as Locale].partner;
  const productsHref = `/${lang}/partner/products`;
  const productName = lang === 'th' ? product.nameTh || product.nameEn : product.nameEn;

  return (
    <div className="partner-page partner-dashboard-page">
      <PartnerNav lang={lang as Locale} current="products" pendingCount={pendingCount} isLoggedIn />
      <div className="container">
        <h1 className="partner-title">
          {lang === 'th' ? 'แก้ไขสินค้า' : 'Edit product'}
        </h1>
        <p className="partner-subline" style={{ marginBottom: 16 }}>
          {productName}
        </p>
        <p style={{ fontSize: 14, color: 'var(--color-muted)', marginBottom: 16 }}>
          {lang === 'th'
            ? 'การแก้ไขจะถูกส่งเพื่อตรวจสอบก่อนนำไปใช้'
            : 'Changes will be submitted for approval before going live.'}
        </p>
        <ProductEditForm
          lang={lang as Locale}
          productId={product.id}
          initial={{
            nameEn: product.nameEn,
            nameTh: product.nameTh,
            descriptionEn: product.descriptionEn,
            descriptionTh: product.descriptionTh,
            category: product.category,
            price: product.price,
            preparationTime: product.preparationTime,
            occasion: product.occasion,
          }}
          backHref={productsHref}
        />
      </div>
    </div>
  );
}
