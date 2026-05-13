import type { Metadata } from 'next';
import {
  buildSupplierRequestUrl,
  isActiveSupplierRequestStatus,
  isSupplierRequestExpired,
  parseSupplierProductSnapshot,
  SUPPLIER_REQUEST_BASE_URL,
  type SupplierProductSnapshot,
} from '@/lib/supplierRequests';

const SITE_NAME = 'Lanna Bloom';
const FALLBACK_OG_PATH = '/og/supplier-request.jpg';
const GENERIC_BRAND_TITLE = 'Lanna Bloom Supplier Request';
const UNAVAILABLE_DESCRIPTION = 'This supplier request is no longer available.';
const GENERIC_ACTIVE_DESCRIPTION =
  'Please review this flower order request and confirm availability.';
const IMAGE_ALT_FALLBACK = 'Lanna Bloom supplier request';

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
 * Product line for OG text only: catalog item titles (English title preferred), never custom-order
 * notes, gift text, or customer comments (may contain private content).
 */
export function safeSupplierCatalogProductLine(product: SupplierProductSnapshot): string | null {
  const parts: string[] = [];
  for (const item of product.items) {
    const label = (item.title?.trim() || item.displayTitle?.trim()) ?? '';
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
      title: GENERIC_BRAND_TITLE,
      description: UNAVAILABLE_DESCRIPTION,
      robots,
      openGraph: {
        title: GENERIC_BRAND_TITLE,
        description: UNAVAILABLE_DESCRIPTION,
        url: pageUrl,
        siteName: SITE_NAME,
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
        title: GENERIC_BRAND_TITLE,
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
    ? `Supplier Request: ${truncateOg(safeProductLine, 56)}`
    : GENERIC_BRAND_TITLE;
  const description = safeProductLine
    ? `${truncateOg(safeProductLine, 88)} · Please confirm if your shop can prepare this order.`
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
      siteName: SITE_NAME,
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
