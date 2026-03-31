'use client';

import Link from 'next/link';
import type { Partner } from '@/lib/bouquets';
import { Card } from '@/components/partner/Card';
import { Btn } from '@/components/partner/Btn';
import type { Locale } from '@/lib/i18n';

type DashboardT = {
  shopInfo: string;
  edit: string;
  shopNameLabel: string;
  contactNameLabel: string;
  bioLabel: string;
  addressLabel: string;
  phoneLabel: string;
  lineLabel: string;
  copyLine: string;
  call: string;
  openMaps: string;
};

export function PartnerShopInfoClient({ lang, partner, t }: { lang: Locale; partner: Partner; t: DashboardT }) {
  const lineId = partner.lineOrWhatsapp ?? '';
  const phone = partner.phoneNumber ?? '';
  const address = partner.shopAddress ?? '';
  const bio = lang === 'th' ? (partner.shopBioTh ?? '') : (partner.shopBioEn ?? '');
  const editShopInfoHref = `/${lang}/partner/shop/edit`;
  const mapsUrl = address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
    : '';

  function handleCopyLine() {
    if (lineId && typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(lineId);
    }
  }

  return (
    <>
      <div className="partner-shop-info-header">
        <div className="partner-dashboard-section-title" style={{ marginBottom: 0 }}>
          {t.shopInfo}
        </div>
        <Link href={editShopInfoHref} className="partner-dashboard-link">
          <Btn small variant="ghost">{t.edit}</Btn>
        </Link>
      </div>
      <Card style={{ marginBottom: 16 }}>
        <div className="partner-dashboard-shop-row">
          <span className="partner-dashboard-shop-icon">🏷️</span>
          <div className="partner-dashboard-shop-content">
            <div className="partner-dashboard-shop-label">{t.shopNameLabel}</div>
            <div className="partner-dashboard-shop-value">{partner.shopName || '—'}</div>
          </div>
        </div>
        <div className="partner-dashboard-shop-row">
          <span className="partner-dashboard-shop-icon">👤</span>
          <div className="partner-dashboard-shop-content">
            <div className="partner-dashboard-shop-label">{t.contactNameLabel}</div>
            <div className="partner-dashboard-shop-value">{partner.contactName || '—'}</div>
          </div>
        </div>
        <div className="partner-dashboard-shop-row">
          <span className="partner-dashboard-shop-icon">📝</span>
          <div className="partner-dashboard-shop-content">
            <div className="partner-dashboard-shop-label">{t.bioLabel}</div>
            <div className="partner-dashboard-shop-value" style={{ whiteSpace: 'pre-wrap' }}>
              {bio || '—'}
            </div>
          </div>
        </div>
        <div className="partner-dashboard-shop-row">
          <span className="partner-dashboard-shop-icon">📍</span>
          <div className="partner-dashboard-shop-content">
            <div className="partner-dashboard-shop-label">{t.addressLabel}</div>
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
              <div className="partner-dashboard-shop-label">{t.lineLabel}</div>
              <div className="partner-dashboard-shop-value">{lineId}</div>
            </div>
            <Btn small variant="ghost" onClick={handleCopyLine}>
              {t.copyLine}
            </Btn>
          </div>
        )}
        {phone && (
          <div className="partner-dashboard-shop-row">
            <span className="partner-dashboard-shop-icon">📞</span>
            <div className="partner-dashboard-shop-content">
              <div className="partner-dashboard-shop-label">{t.phoneLabel}</div>
              <div className="partner-dashboard-shop-value">{phone}</div>
            </div>
            <a href={`tel:${phone}`}>
              <Btn small variant="ghost">{t.call}</Btn>
            </a>
          </div>
        )}
      </Card>
    </>
  );
}

