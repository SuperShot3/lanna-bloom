import { redirect, notFound } from 'next/navigation';
import { isValidLocale, translations, type Locale } from '@/lib/i18n';
import { PartnerNav } from '@/components/partner/PartnerNav';
import { getPartnerSession } from '@/lib/supabase/partnerAuthServer';
import { getPartnerBySupabaseUserId, getPendingCountByPartnerId } from '@/lib/sanity';
import { AddProductWizard } from './AddProductWizard';

export default async function AddProductPage({
  params,
  searchParams,
}: {
  params: { lang: string };
  searchParams: Promise<{ success?: string }> | { success?: string };
}) {
  const lang = params.lang;
  if (!isValidLocale(lang)) notFound();

  const session = await getPartnerSession();
  if (!session) redirect(`/${lang}/partner/login`);

  const partner = await getPartnerBySupabaseUserId(session.user.id);
  if (!partner) redirect(`/${lang}/partner/login`);

  const resolvedSearchParams = await Promise.resolve(searchParams);
  const success = resolvedSearchParams.success;
  const t = translations[lang as Locale].partnerPortal.addProduct;
  const pendingCount = await getPendingCountByPartnerId(partner.id);

  if (success === 'bouquet' || success === 'product') {
    return (
      <div className="partner-page partner-add-product-page">
        <PartnerNav lang={lang as Locale} current="productsAdd" pendingCount={pendingCount} />
        <div className="container">
          <div className="partner-apply-done">
            <div className="partner-apply-done-emoji">✅</div>
            <h2 className="partner-apply-done-title">{t.successTitle}</h2>
            <p className="partner-apply-done-sub">{t.successSub}</p>
            <a href={`/${lang}/partner/products`} className="partner-btn partner-btn--primary" style={{ marginTop: 20, display: 'inline-block', textDecoration: 'none' }}>
              {translations[lang as Locale].partnerPortal.dashboard.myProducts}
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="partner-page partner-add-product-page">
      <PartnerNav lang={lang as Locale} current="productsAdd" />
      <div className="container">
        <AddProductWizard lang={lang as Locale} partnerId={partner.id} />
      </div>
    </div>
  );
}
