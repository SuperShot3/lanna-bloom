import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { isValidLocale, translations, type Locale } from '@/lib/i18n';
import { PartnerNav } from '@/components/partner/PartnerNav';
import { getPartnerSession } from '@/lib/supabase/partnerAuthServer';
import {
  getPartnerBySupabaseUserId,
  getBouquetsByPartnerId,
  getProductsByPartnerId,
  getPendingCountByPartnerId,
} from '@/lib/sanity';
import { Card } from '@/components/partner/Card';
import { Badge } from '@/components/partner/Badge';
import { Btn } from '@/components/partner/Btn';
import type { Bouquet } from '@/lib/bouquets';
import type { PartnerProduct } from '@/lib/sanity';

function bouquetStatusToBadge(s?: string): 'pending' | 'approved' | 'active' | 'rejected' | 'submitted' | 'needs_changes' {
  if (s === 'approved') return 'active';
  if (s === 'pending_review') return 'submitted';
  return 'submitted';
}

function productStatusToBadge(s?: string): 'pending' | 'approved' | 'active' | 'rejected' | 'submitted' | 'needs_changes' {
  if (s === 'live') return 'active';
  if (s === 'needs_changes') return 'needs_changes';
  return 'submitted';
}

export default async function PartnerProductsListPage({
  params,
}: {
  params: { lang: string };
}) {
  const lang = params.lang;
  if (!isValidLocale(lang)) notFound();

  const session = await getPartnerSession();
  if (!session) redirect(`/${lang}/partner/login`);

  const partner = await getPartnerBySupabaseUserId(session.user.id);
  if (!partner) redirect(`/${lang}/partner/login`);

  const [bouquets, products, pendingCount] = await Promise.all([
    getBouquetsByPartnerId(partner.id),
    getProductsByPartnerId(partner.id),
    getPendingCountByPartnerId(partner.id),
  ]);

  const t = translations[lang as Locale].partnerPortal.dashboard;
  const tBadge = translations[lang as Locale].partnerPortal.badge;
  const tPartner = translations[lang as Locale].partner;

  return (
    <div className="partner-page partner-dashboard-page">
      <PartnerNav lang={lang as Locale} current="products" pendingCount={pendingCount} />
      <div className="container">
        <div className="partner-dashboard-welcome-top" style={{ marginBottom: 16 }}>
          <h1 className="partner-title">{t.myProducts}</h1>
          <Link href={`/${lang}/partner/products/new`}>
            <Btn variant="secondary">+ {t.addProduct}</Btn>
          </Link>
        </div>

        <Card>
          {bouquets.length === 0 && products.length === 0 ? (
            <div className="partner-dashboard-products-empty">
              <p>{t.noProducts ?? 'No products yet'}</p>
              <Link href={`/${lang}/partner/products/new`}>
                <Btn variant="secondary" style={{ width: '100%', justifyContent: 'center' }}>
                  + {t.addProduct}
                </Btn>
              </Link>
            </div>
          ) : (
            <>
              {bouquets.map((b: Bouquet) => {
                const minPrice = b.sizes?.length ? Math.min(...b.sizes.map((s) => s.price)) : 0;
                const name = lang === 'th' ? b.nameTh : b.nameEn;
                return (
                  <Link
                    key={`bouquet-${b.id}`}
                    href={`/${lang}/partner/products/bouquets/${b.id}/edit`}
                    className="partner-dashboard-product-row"
                    style={{ textDecoration: 'none', color: 'inherit' }}
                  >
                    <div className="partner-dashboard-product-thumb">
                      {b.images?.[0] ? (
                        <img
                          src={b.images[0]}
                          alt=""
                          width={44}
                          height={44}
                          style={{ objectFit: 'cover', borderRadius: 10 }}
                        />
                      ) : (
                        <span>🌸</span>
                      )}
                    </div>
                    <div className="partner-dashboard-product-info" style={{ flex: 1 }}>
                      <div className="partner-dashboard-product-name">{name}</div>
                      <div className="partner-dashboard-product-price">
                        {minPrice > 0 ? `฿${minPrice}` : '—'}
                      </div>
                    </div>
                    <Badge
                      status={bouquetStatusToBadge(b.status)}
                      labelTh={tBadge[bouquetStatusToBadge(b.status)] ?? tBadge.submitted}
                    />
                    <span style={{ opacity: 0.6 }}>→</span>
                  </Link>
                );
              })}
              {products.map((p: PartnerProduct) => {
                const name = lang === 'th' ? p.nameTh : p.nameEn;
                return (
                  <Link
                    key={`product-${p.id}`}
                    href={`/${lang}/partner/products/${p.id}/edit`}
                    className="partner-dashboard-product-row"
                    style={{ textDecoration: 'none', color: 'inherit' }}
                  >
                    <div className="partner-dashboard-product-thumb">
                      {p.imageUrl ? (
                        <img
                          src={p.imageUrl}
                          alt=""
                          width={44}
                          height={44}
                          style={{ objectFit: 'cover', borderRadius: 10 }}
                        />
                      ) : (
                        <span>🎁</span>
                      )}
                    </div>
                    <div className="partner-dashboard-product-info" style={{ flex: 1 }}>
                      <div className="partner-dashboard-product-name">{name}</div>
                      <div className="partner-dashboard-product-price">
                        {p.price > 0 ? `฿${p.price}` : '—'}
                      </div>
                    </div>
                    <Badge
                      status={productStatusToBadge(p.moderationStatus)}
                      labelTh={tBadge[productStatusToBadge(p.moderationStatus)] ?? tBadge.submitted}
                    />
                    <span style={{ opacity: 0.6 }}>→</span>
                  </Link>
                );
              })}
              <div className="partner-dashboard-products-add" style={{ marginTop: 16 }}>
                <Link href={`/${lang}/partner/products/new`}>
                  <Btn variant="secondary" style={{ width: '100%', justifyContent: 'center' }}>
                    + {t.addProduct}
                  </Btn>
                </Link>
              </div>
            </>
          )}
        </Card>

        <div style={{ marginTop: 16 }}>
          <Link href={`/${lang}/partner`}>
            <Btn variant="ghost">{tPartner.backToDashboard}</Btn>
          </Link>
        </div>
      </div>
    </div>
  );
}
