'use client';

import Link from 'next/link';
import type { Partner } from '@/lib/bouquets';
import type { Bouquet } from '@/lib/bouquets';
import { Card } from '@/components/partner/Card';
import { Badge } from '@/components/partner/Badge';
import { Btn } from '@/components/partner/Btn';
import type { Locale } from '@/lib/i18n';

type DashboardT = {
  hello: string;
  quickActions: string;
  addProduct: string;
  myProducts: string;
  ordersSoon: string;
  contactSupport: string;
  shopInfo: string;
  editProfile: string;
  copyLine: string;
  openLine: string;
  call: string;
  openMaps: string;
};

type BadgeT = Record<string, string>;

type PartnerDashboardClientProps = {
  lang: Locale;
  partner: Partner;
  bouquets: Bouquet[];
  t: DashboardT;
  tBadge: BadgeT;
};

function partnerStatusToBadge(s: string): 'pending' | 'approved' | 'active' | 'rejected' | 'submitted' | 'needs_changes' {
  if (s === 'approved') return 'approved';
  if (s === 'pending_review') return 'pending';
  if (s === 'disabled') return 'rejected';
  return 'pending';
}

function bouquetStatusToBadge(s?: string): 'pending' | 'approved' | 'active' | 'rejected' | 'submitted' | 'needs_changes' {
  if (s === 'approved') return 'active';
  if (s === 'pending_review') return 'submitted';
  return 'submitted';
}

export function PartnerDashboardClient({
  lang,
  partner,
  bouquets,
  t,
  tBadge,
}: PartnerDashboardClientProps) {
  const lineId = partner.lineOrWhatsapp ?? '';
  const phone = partner.phoneNumber ?? '';
  const address = partner.shopAddress ?? '';
  const mapsUrl = address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
    : '';
  const lineAddUrl = lineId
    ? `https://line.me/ti/p/~${lineId.replace(/^@/, '')}`
    : '';

  function handleCopyLine() {
    if (lineId && typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(lineId);
    }
  }

  return (
    <>
      <Card className="partner-dashboard-welcome" style={{ background: 'linear-gradient(135deg, var(--color-sage-light) 0%, var(--color-cream) 100%)', marginBottom: 16 }}>
        <div className="partner-dashboard-welcome-top">
          <div>
            <div className="partner-dashboard-welcome-label">{t.hello}</div>
            <div className="partner-dashboard-welcome-shop">{partner.shopName} 🌸</div>
            <div className="partner-dashboard-welcome-sub">
              {partner.contactName} · {partner.city}
            </div>
          </div>
          <Badge status={partnerStatusToBadge(partner.status)} labelTh={tBadge[partnerStatusToBadge(partner.status)] ?? tBadge.pending} />
        </div>
        <div className="partner-dashboard-welcome-actions">
          {lineAddUrl && (
            <a href={lineAddUrl} target="_blank" rel="noopener noreferrer" className="partner-dashboard-link">
              <Btn small variant="ghost">💬 {t.openLine}</Btn>
            </a>
          )}
          {phone && (
            <a href={`tel:${phone}`} className="partner-dashboard-link">
              <Btn small variant="ghost">📞 {t.call}</Btn>
            </a>
          )}
        </div>
      </Card>

      <div className="partner-dashboard-section-title">{t.quickActions}</div>
      <div className="partner-dashboard-quick-actions">
        <Link href={`/${lang}/partner/products/new`} className="partner-dashboard-action-card">
          <Card style={{ padding: 16, cursor: 'pointer', height: '100%' }}>
            <div className="partner-dashboard-action-icon">➕</div>
            <div className="partner-dashboard-action-label">{t.addProduct}</div>
          </Card>
        </Link>
        <div className="partner-dashboard-action-card partner-dashboard-action-card--scroll">
          <Card style={{ padding: 16, height: '100%' }}>
            <div className="partner-dashboard-action-icon">📦</div>
            <div className="partner-dashboard-action-label">{t.myProducts}</div>
          </Card>
        </div>
        <div className="partner-dashboard-action-card partner-dashboard-action-card--disabled">
          <Card style={{ padding: 16, opacity: 0.5, cursor: 'not-allowed', height: '100%' }}>
            <div className="partner-dashboard-action-icon">🛒</div>
            <div className="partner-dashboard-action-label">{t.ordersSoon}</div>
          </Card>
        </div>
        {lineAddUrl && (
          <a href={lineAddUrl} target="_blank" rel="noopener noreferrer" className="partner-dashboard-action-card">
            <Card style={{ padding: 16, cursor: 'pointer', height: '100%' }}>
              <div className="partner-dashboard-action-icon">💬</div>
              <div className="partner-dashboard-action-label">{t.contactSupport}</div>
            </Card>
          </a>
        )}
      </div>

      <div className="partner-dashboard-section-title">{t.shopInfo}</div>
      <Card style={{ marginBottom: 16 }}>
        <div className="partner-dashboard-shop-row">
          <span className="partner-dashboard-shop-icon">📍</span>
          <div className="partner-dashboard-shop-content">
            <div className="partner-dashboard-shop-label">ที่อยู่</div>
            <div className="partner-dashboard-shop-value">{address || '—'}</div>
          </div>
          {mapsUrl && (
            <a href={mapsUrl} target="_blank" rel="noopener noreferrer">
              <Btn small variant="ghost">{t.openMaps}</Btn>
            </a>
          )}
        </div>
        {lineId && (
          <div className="partner-dashboard-shop-row">
            <span className="partner-dashboard-shop-icon">💬</span>
            <div className="partner-dashboard-shop-content">
              <div className="partner-dashboard-shop-label">LINE ID</div>
              <div className="partner-dashboard-shop-value">{lineId}</div>
            </div>
            <Btn small variant="ghost" onClick={handleCopyLine}>{t.copyLine}</Btn>
          </div>
        )}
        {phone && (
          <div className="partner-dashboard-shop-row">
            <span className="partner-dashboard-shop-icon">📞</span>
            <div className="partner-dashboard-shop-content">
              <div className="partner-dashboard-shop-label">โทร</div>
              <div className="partner-dashboard-shop-value">{phone}</div>
            </div>
            <a href={`tel:${phone}`}>
              <Btn small variant="ghost">{t.call}</Btn>
            </a>
          </div>
        )}
      </Card>

      <div className="partner-dashboard-section-title">{t.myProducts}</div>
      <Card>
        {bouquets.length === 0 ? (
          <div className="partner-dashboard-products-empty">
            <p>ยังไม่มีสินค้า</p>
            <Link href={`/${lang}/partner/products/new`}>
              <Btn variant="secondary" style={{ width: '100%', justifyContent: 'center' }}>
                + {t.addProduct}
              </Btn>
            </Link>
          </div>
        ) : (
          <>
            {bouquets.map((b) => {
              const minPrice = b.sizes?.length ? Math.min(...b.sizes.map((s) => s.price)) : 0;
              const name = lang === 'th' ? b.nameTh : b.nameEn;
              return (
                <div key={b.id} className="partner-dashboard-product-row">
                  <div className="partner-dashboard-product-thumb">
                    {b.images?.[0] ? (
                      <img src={b.images[0]} alt="" width={44} height={44} style={{ objectFit: 'cover', borderRadius: 10 }} />
                    ) : (
                      <span>🌸</span>
                    )}
                  </div>
                  <div className="partner-dashboard-product-info">
                    <div className="partner-dashboard-product-name">{name}</div>
                    <div className="partner-dashboard-product-price">
                      {minPrice > 0 ? `฿${minPrice}` : '—'}
                    </div>
                  </div>
                  <Badge status={bouquetStatusToBadge(b.status)} labelTh={tBadge[bouquetStatusToBadge(b.status)] ?? tBadge.submitted} />
                </div>
              );
            })}
            <div className="partner-dashboard-products-add">
              <Link href={`/${lang}/partner/products/new`}>
                <Btn variant="secondary" style={{ width: '100%', justifyContent: 'center' }}>
                  + {t.addProduct}
                </Btn>
              </Link>
            </div>
          </>
        )}
      </Card>
    </>
  );
}
