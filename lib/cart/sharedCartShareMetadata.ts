import type { Metadata } from 'next';
import type { CartItem } from '@/contexts/CartContext';
import type { Locale } from '@/lib/i18n';
import { translations } from '@/lib/i18n';
import { resolveProductOgImage } from '@/lib/seo/productJsonLd';
import {
  absoluteSiteUrl,
  openGraphLocale,
  websiteOpenGraph,
} from '@/lib/seo/shareMetadata';

const NAME_MAX = 48;

function truncateName(name: string): string {
  const t = name.trim();
  if (t.length <= NAME_MAX) return t;
  return `${t.slice(0, NAME_MAX - 1)}…`;
}

export function cartLineDisplayName(item: CartItem, lang: Locale): string {
  const name =
    lang === 'th'
      ? item.nameTh?.trim() || item.nameEn?.trim()
      : item.nameEn?.trim() || item.nameTh?.trim();
  if (name) return name;
  return lang === 'th' ? 'สินค้า' : 'Item';
}

export function buildSharedCartShareCopy(
  items: CartItem[],
  lang: Locale
): { title: string; description: string; imageAlt: string } {
  const first = items[0];
  const name = first ? truncateName(cartLineDisplayName(first, lang)) : '';
  const extraLines = Math.max(0, items.length - 1);
  const cartLabel = translations[lang].cart.yourCart;

  if (lang === 'th') {
    const titleCore = extraLines > 0 ? `${name} และอีก ${extraLines} รายการ` : name;
    return {
      title: `${cartLabel}: ${titleCore} | Lanna Bloom`,
      description: extraLines > 0
        ? `ตะกร้าที่แชร์มี ${name} และอีก ${extraLines} รายการ เปิดลิงก์เพื่อดูสินค้าและชำระเงินอย่างปลอดภัย`
        : `ตะกร้าที่แชร์มี ${name} เปิดลิงก์เพื่อดูสินค้าและชำระเงินอย่างปลอดภัย`,
      imageAlt: name ? `${name} ในตะกร้า Lanna Bloom` : cartLabel,
    };
  }

  const titleCore = extraLines > 0 ? `${name} + ${extraLines} more` : name;
  return {
    title: `${cartLabel}: ${titleCore} | Lanna Bloom`,
    description: extraLines > 0
      ? `Shared cart with ${name} and ${extraLines} more ${extraLines === 1 ? 'item' : 'items'}. Open to review and check out securely.`
      : `Shared cart with ${name}. Open to review the items and check out securely.`,
    imageAlt: name ? `${name} in a Lanna Bloom cart` : cartLabel,
  };
}

export function sharedCartOgImage(
  items: CartItem[],
  alt?: string
): { url: string; alt?: string } | undefined {
  const urls = items
    .map((item) => item.imageUrl?.trim())
    .filter((url): url is string => Boolean(url));
  return resolveProductOgImage(urls, alt ? { alt } : undefined);
}

function genericCartDescription(lang: Locale): string {
  if (lang === 'th') {
    return 'ดูสินค้าในตะกร้า แล้วชำระเงินอย่างปลอดภัยกับ Lanna Bloom';
  }
  return 'Review the items in your cart, then check out securely with Lanna Bloom.';
}

/**
 * Cart / shared-cart Open Graph. Never uses Chiang Mai default copy or image
 * when a product photo is available. Does not include prices or checkout PII.
 */
export function buildCartPageMetadata(opts: {
  lang: Locale;
  shareToken: string | null;
  items: CartItem[] | null;
}): Metadata {
  const { lang, shareToken, items } = opts;
  const cartLabel = translations[lang].cart.yourCart;
  const fallbackTitle = `${cartLabel} | Lanna Bloom`;
  const fallbackDescription = genericCartDescription(lang);
  const pageUrl =
    shareToken && items && items.length > 0
      ? `${absoluteSiteUrl(`/${lang}/cart`)}?share=${encodeURIComponent(shareToken)}`
      : absoluteSiteUrl(`/${lang}/cart`);

  const robots = { index: false, follow: false } as const;

  if (!shareToken || !items || items.length === 0) {
    return {
      title: fallbackTitle,
      description: fallbackDescription,
      robots,
      openGraph: websiteOpenGraph({
        title: fallbackTitle,
        description: fallbackDescription,
        url: pageUrl,
        locale: openGraphLocale(lang),
        images: [],
      }),
      twitter: {
        card: 'summary',
        title: fallbackTitle,
        description: fallbackDescription,
        images: [],
      },
    };
  }

  const copy = buildSharedCartShareCopy(items, lang);
  const ogImage = sharedCartOgImage(items, copy.imageAlt);
  const images = ogImage
    ? [
        {
          url: ogImage.url,
          secureUrl: ogImage.url,
          ...(ogImage.alt ? { alt: ogImage.alt } : {}),
        },
      ]
    : [];

  return {
    title: copy.title,
    description: copy.description,
    robots,
    openGraph: websiteOpenGraph({
      title: copy.title,
      description: copy.description,
      url: pageUrl,
      locale: openGraphLocale(lang),
      images,
    }),
    twitter: {
      card: ogImage ? 'summary_large_image' : 'summary',
      title: copy.title,
      description: copy.description,
      images: ogImage ? [ogImage.url] : [],
    },
  };
}
