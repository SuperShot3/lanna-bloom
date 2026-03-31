import { redirect, notFound } from 'next/navigation';
import { isValidLocale, translations, type Locale } from '@/lib/i18n';
import { PartnerNav } from '@/components/partner/PartnerNav';
import { getPartnerSession } from '@/lib/supabase/partnerAuthServer';
import { getPartnerBySupabaseUserId, getProductById, getPendingCountByPartnerId } from '@/lib/sanity';
import { Card } from '@/components/partner/Card';
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
  const adminSummary = product.adminChangeSummary?.trim();
  const hasAdminOverrides = !!product.adminOverrides && Object.values(product.adminOverrides).some((v) => !!(v ?? '').toString().trim());

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

        {(adminSummary || hasAdminOverrides) && (
          <div style={{ marginBottom: 16 }}>
            <Card>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>
                    {lang === 'th' ? 'อัปเดตจากแอดมิน' : 'Admin updates'}
                  </div>
                  {adminSummary && (
                    <div style={{ fontSize: 14, color: 'var(--color-text)', whiteSpace: 'pre-wrap' }}>
                      {adminSummary}
                    </div>
                  )}
                  {hasAdminOverrides && (
                    <div style={{ marginTop: 8, fontSize: 13, color: 'var(--color-muted)' }}>
                      {lang === 'th'
                        ? 'แอดมินได้ปรับข้อมูลบางส่วนเพื่อให้ตรงตามข้อกำหนด SEO'
                        : 'Admin adjusted some fields to align with SEO requirements.'}
                    </div>
                  )}
                </div>
                {product.adminLastEditedAt && (
                  <div style={{ fontSize: 12, color: 'var(--color-muted)', textAlign: 'right' }}>
                    {lang === 'th' ? 'อัปเดตเมื่อ' : 'Updated'}{' '}
                    {new Date(product.adminLastEditedAt).toLocaleDateString()}
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}

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
