import type { Metadata } from 'next';
import type { Locale } from '@/lib/i18n';
import type { MarketRegistryEntry } from '@/lib/delivery/markets';
import { marketIsIndexable } from '@/lib/delivery/markets';
import { buildAlternates } from '@/lib/seo/alternates';
import { marketShareImages } from '@/lib/seo/marketShareImages';
import {
  defaultShareImages,
  openGraphLocale,
  websiteOpenGraph,
  websiteTwitter,
} from '@/lib/seo/shareMetadata';

export type MarketSeoKind = 'landing' | 'catalog' | 'product';

function placeName(market: MarketRegistryEntry, lang: Locale): string {
  return lang === 'th' ? market.customerFacingNameTh : market.customerFacingNameEn;
}

function pathSuffixForKind(params: {
  kind: MarketSeoKind;
  market: MarketRegistryEntry;
  productSlug?: string;
}): string {
  const { kind, market, productSlug } = params;
  if (kind === 'landing') {
    return `/${market.pathSlug}/flower-delivery`;
  }
  if (kind === 'catalog') {
    return `/catalog/${market.pathSlug}/catalog`;
  }
  return `/catalog/${market.pathSlug}/${productSlug ?? ''}`;
}

function copyForKind(params: {
  kind: MarketSeoKind;
  market: MarketRegistryEntry;
  place: string;
  lang: Locale;
  productName?: string;
}): { title: string; description: string } {
  const { kind, market, place, lang, productName } = params;
  const bouquetOnly =
    lang === 'th'
      ? ' (ช่อดอกไม้เท่านั้น)'
      : lang === 'zh-hk'
        ? '（只提供花束配送）'
        : ' (bouquet delivery only)';

  if (kind === 'landing') {
    if (lang === 'zh-hk') {
      return {
        title: `鮮花配送 ${place} | Lanna Bloom`,
        description: `新鮮花束送遞至${place}${bouquetOnly}。網上選購花束，安全結帳。`,
      };
    }
    const overrideTitle = lang === 'th' ? market.seoTitleTh : market.seoTitleEn;
    const overrideDesc =
      lang === 'th' ? market.metaDescriptionTh : market.metaDescriptionEn;
    return {
      title:
        overrideTitle?.trim() ||
        (lang === 'th'
          ? `ส่งดอกไม้ ${place} | Lanna Bloom`
          : `Flower delivery ${place} | Lanna Bloom`),
      description:
        overrideDesc?.trim() ||
        (lang === 'th'
          ? `ช่อดอกไม้สด จัดส่ง${place}${bouquetOnly} เลือกช่อออนไลน์ ชำระเงินปลอดภัย`
          : `Fresh flower bouquets delivered in ${place}${bouquetOnly}. Order online with secure checkout.`),
    };
  }

  if (kind === 'catalog') {
    if (lang === 'zh-hk') {
      return {
        title: `${place}鮮花目錄 | Lanna Bloom`,
        description: `瀏覽送遞至${place}的花束${bouquetOnly}。於 Lanna Bloom 網上安全結帳。`,
      };
    }
    return {
      title:
        lang === 'th'
          ? `แคตตาล็อกดอกไม้ ${place} | Lanna Bloom`
          : `${place} flower catalog | Lanna Bloom`,
      description:
        lang === 'th'
          ? `เลือกช่อดอกไม้สำหรับจัดส่ง${place}${bouquetOnly} สั่งออนไลน์ชำระเงินปลอดภัยกับ Lanna Bloom`
          : `Browse flower bouquets for delivery in ${place}${bouquetOnly}. Order online with secure checkout from Lanna Bloom.`,
    };
  }

  const name =
    productName?.trim() ||
    (lang === 'th' ? 'ช่อดอกไม้' : lang === 'zh-hk' ? '花束' : 'Bouquet');
  if (lang === 'zh-hk') {
    return {
      title: `${name} | 鮮花配送 ${place} | Lanna Bloom`,
      description: `訂購${name}，送遞至${place}${bouquetOnly}`,
    };
  }
  return {
    title:
      lang === 'th'
        ? `${name} | ส่งดอกไม้ ${place} | Lanna Bloom`
        : `${name} | Flower delivery ${place} | Lanna Bloom`,
    description:
      lang === 'th'
        ? `สั่ง${name} พร้อมจัดส่งใน${place}${bouquetOnly}`
        : `Order ${name} with flower delivery in ${place}${bouquetOnly}.`,
  };
}

/**
 * Build title/description + explicit openGraph/twitter so root Chiang Mai OG is overridden.
 * Applies city-status robots (coming_soon → noindex,follow).
 */
export function buildMarketPageMetadata(params: {
  lang: Locale;
  market: MarketRegistryEntry;
  kind: MarketSeoKind;
  productName?: string;
  productSlug?: string;
  /** Absolute product image for OG/Twitter (market PDPs). */
  ogImage?: { url: string; alt?: string };
}): Metadata {
  const place = placeName(params.market, params.lang);
  const { title, description } = copyForKind({
    kind: params.kind,
    market: params.market,
    place,
    lang: params.lang,
    productName: params.productName,
  });
  const pathSuffix = pathSuffixForKind({
    kind: params.kind,
    market: params.market,
    productSlug: params.productSlug,
  });
  const alternates = buildAlternates({
    lang: params.lang,
    pathSuffix,
  });
  const canonical =
    typeof alternates.canonical === 'string' ? alternates.canonical : undefined;

  const indexable = marketIsIndexable(params.market);
  const cityShare =
    !params.ogImage &&
    (params.kind === 'landing' || params.kind === 'catalog')
      ? marketShareImages(params.market, params.lang)
      : undefined;
  const ogImage = params.ogImage;
  const shareImages = ogImage
    ? [
        {
          url: ogImage.url,
          secureUrl: ogImage.url,
          ...(ogImage.alt ? { alt: ogImage.alt } : {}),
        },
      ]
    : cityShare ?? defaultShareImages();

  return {
    title,
    description,
    ...(indexable
      ? {}
      : { robots: { index: false, follow: true } }),
    alternates,
    openGraph: websiteOpenGraph({
      title,
      description,
      url: canonical ?? String(alternates.canonical ?? ''),
      locale: openGraphLocale(params.lang),
      images: shareImages,
    }),
    twitter: websiteTwitter({
      title,
      description,
      imageUrl: ogImage?.url ?? cityShare?.[0]?.url,
    }),
  };
}
