import type { Metadata } from 'next';
import {
  buildSupplierRequestUrl,
  isActiveSupplierRequestStatus,
  isSupplierRequestExpired,
  parseSupplierProductSnapshot,
  SUPPLIER_REQUEST_BASE_URL,
  type SupplierProductSnapshot,
} from '@/lib/supplierRequests';

const FALLBACK_OG_PATH = '/og/supplier-request.jpg';
/** Thai-only social preview (no brand); matches supplier task UI kicker tone. */
const OG_SITE_NAME = 'คำขอจัดเตรียมสินค้า';
const GENERIC_TITLE = 'คำขอจัดเตรียมสินค้า';
const UNAVAILABLE_DESCRIPTION = 'คำขอนี้ไม่พร้อมใช้งานแล้ว';
const GENERIC_ACTIVE_DESCRIPTION = 'กรุณาตรวจสอบคำขอจัดดอกไม้และยืนยันความพร้อม';
const IMAGE_ALT_FALLBACK = 'คำขอจัดเตรียมสินค้า';

function truncateOg(text: string, maxLen: number): string {
  const s = text.trim();
  if (!s) return '';
  return s.length <= maxLen ? s : `${s.slice(0, Math.max(0, maxLen - 1))}…`;
}

function assetOriginBase(): string {
  return SUPPLIER_REQUEST_BASE_URL.replace(/\/+$/, '');
}

/** Absolute URL for OG/Twitter; supports CDN `https://` and site-relative `/...` paths. */
export function supplierTaskAbsoluteAssetUrl(url: string): string {
  const u = url.trim();
  if (/^https?:\/\//i.test(u)) return u;
  if (u.startsWith('//')) return `https:${u}`;
  const base = assetOriginBase();
  const path = u.startsWith('/') ? u : `/${u}`;
  return `${base}${path}`;
}

/**
 * Product line for OG text only: catalog labels (`displayTitle` first for Thai), never custom-order
 * notes, gift text, or customer comments (may contain private content).
 */
export function safeSupplierCatalogProductLine(product: SupplierProductSnapshot): string | null {
  const parts: string[] = [];
  for (const item of product.items) {
    const label = (item.displayTitle?.trim() || item.title?.trim()) ?? '';
    if (label) parts.push(label);
  }
  if (!parts.length) return null;
  return truncateOg(parts.join(' · '), 90);
}

/** Same rule as the supplier task UI: first line item that carries an image URL. */
export function supplierTaskMainProductImageUrl(product: SupplierProductSnapshot): string | null {
  const hit = product.items.find((item) => item.imageUrl?.trim());
  return hit?.imageUrl?.trim() ?? null;
}

function isPubliclyActiveTask(status: string | null | undefined, expiresAt: string | null | undefined): boolean {
  return isActiveSupplierRequestStatus(status) && !isSupplierRequestExpired(expiresAt);
}

export function buildSupplierTaskMetadata(opts: {
  token: string;
  status: string | null | undefined;
  expiresAt: string | null | undefined;
  productSnapshot: unknown;
}): Metadata {
  const { token, status, expiresAt, productSnapshot } = opts;
  const pageUrl = buildSupplierRequestUrl(token);
  const fallbackImageUrl = supplierTaskAbsoluteAssetUrl(FALLBACK_OG_PATH);
  const robots: Metadata['robots'] = { index: false, follow: false };

  if (!isPubliclyActiveTask(status, expiresAt)) {
    return {
      title: GENERIC_TITLE,
      description: UNAVAILABLE_DESCRIPTION,
      robots,
      openGraph: {
        title: GENERIC_TITLE,
        description: UNAVAILABLE_DESCRIPTION,
        url: pageUrl,
        siteName: OG_SITE_NAME,
        type: 'website',
        images: [
          {
            url: fallbackImageUrl,
            width: 1200,
            height: 630,
            alt: IMAGE_ALT_FALLBACK,
          },
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title: GENERIC_TITLE,
        description: UNAVAILABLE_DESCRIPTION,
        images: [fallbackImageUrl],
      },
    };
  }

  const product = parseSupplierProductSnapshot(productSnapshot);
  const safeProductLine = safeSupplierCatalogProductLine(product);
  const rawImage = supplierTaskMainProductImageUrl(product);
  const ogImageUrl = rawImage ? supplierTaskAbsoluteAssetUrl(rawImage) : fallbackImageUrl;

  const title = safeProductLine
    ? `คำขอจัดเตรียม: ${truncateOg(safeProductLine, 56)}`
    : GENERIC_TITLE;
  const description = safeProductLine
    ? `${truncateOg(safeProductLine, 88)} · กรุณายืนยันว่าร้านสามารถเตรียมคำขอนี้ได้`
    : GENERIC_ACTIVE_DESCRIPTION;
  const imageAlt = safeProductLine ? truncateOg(safeProductLine, 100) : IMAGE_ALT_FALLBACK;

  return {
    title,
    description,
    robots,
    openGraph: {
      title,
      description,
      url: pageUrl,
      siteName: OG_SITE_NAME,
      type: 'website',
      images: [{ url: ogImageUrl, width: 1200, height: 630, alt: imageAlt }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImageUrl],
    },
  };
}
