import type { Metadata } from 'next';
import type { Locale } from '@/lib/i18n';
import type { MarketRegistryEntry } from '@/lib/delivery/markets';
import { getBaseUrl } from '@/lib/orders';

export type MarketSeoKind = 'landing' | 'catalog' | 'product';

function placeName(market: MarketRegistryEntry, isTh: boolean): string {
  return isTh ? market.customerFacingNameTh : market.customerFacingNameEn;
}

function copyForKind(params: {
  kind: MarketSeoKind;
  place: string;
  isTh: boolean;
  productName?: string;
}): { title: string; description: string } {
  const { kind, place, isTh, productName } = params;
  const bouquetOnly = isTh ? ' (ช่อดอกไม้เท่านั้น)' : ' (bouquet delivery only)';

  if (kind === 'landing') {
    return {
      title: isTh
        ? `ส่งดอกไม้ ${place} | Lanna Bloom`
        : `Flower delivery ${place} | Lanna Bloom`,
      description: isTh
        ? `ช่อดอกไม้สด จัดส่ง${place}${bouquetOnly} เลือกช่อออนไลน์ ชำระเงินปลอดภัย`
        : `Fresh flower bouquets delivered in ${place}${bouquetOnly}. Order online with secure checkout.`,
    };
  }

  if (kind === 'catalog') {
    return {
      title: isTh
        ? `แคตตาล็อกดอกไม้ ${place} | Lanna Bloom`
        : `${place} flower catalog | Lanna Bloom`,
      description: isTh
        ? `เลือกช่อดอกไม้สำหรับจัดส่ง${place}${bouquetOnly} สั่งออนไลน์ชำระเงินปลอดภัยกับ Lanna Bloom`
        : `Browse flower bouquets for delivery in ${place}${bouquetOnly}. Order online with secure checkout from Lanna Bloom.`,
    };
  }

  const name = productName?.trim() || (isTh ? 'ช่อดอกไม้' : 'Bouquet');
  return {
    title: isTh
      ? `${name} | ส่งดอกไม้ ${place} | Lanna Bloom`
      : `${name} | Flower delivery ${place} | Lanna Bloom`,
    description: isTh
      ? `สั่ง${name} พร้อมจัดส่งใน${place}${bouquetOnly}`
      : `Order ${name} with flower delivery in ${place}${bouquetOnly}.`,
  };
}

function canonicalForKind(params: {
  kind: MarketSeoKind;
  lang: Locale;
  market: MarketRegistryEntry;
  productSlug?: string;
}): string {
  const base = getBaseUrl();
  const { kind, lang, market, productSlug } = params;
  if (kind === 'landing') {
    return `${base}/${lang}/${market.pathSlug}/flower-delivery`;
  }
  if (kind === 'catalog') {
    return `${base}/${lang}/catalog/${market.pathSlug}/catalog`;
  }
  return `${base}/${lang}/catalog/${market.pathSlug}/${productSlug ?? ''}`;
}

/**
 * Build title/description + explicit openGraph/twitter so root Chiang Mai OG is overridden.
 */
export function buildMarketPageMetadata(params: {
  lang: Locale;
  market: MarketRegistryEntry;
  kind: MarketSeoKind;
  productName?: string;
  productSlug?: string;
}): Metadata {
  const isTh = params.lang === 'th';
  const place = placeName(params.market, isTh);
  const { title, description } = copyForKind({
    kind: params.kind,
    place,
    isTh,
    productName: params.productName,
  });
  const canonical = canonicalForKind({
    kind: params.kind,
    lang: params.lang,
    market: params.market,
    productSlug: params.productSlug,
  });

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: 'Lanna Bloom',
      locale: isTh ? 'th_TH' : 'en_US',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}
