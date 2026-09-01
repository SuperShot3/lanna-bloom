/**
 * Build bilingual product-image alt text from copy that already exists.
 * No AI — dedicated alt wins, then name + composition, then name.
 */

export const PRODUCT_IMAGE_ALT_MAX_LENGTH = 125;

const GENERIC_ALTS = new Set([
  'bouquet image',
  'product image',
  'bouquet product image',
  'image',
  'photo',
  'untitled',
]);

const FILENAME_EXT_RE = /\.(jpe?g|png|webp|gif|heic|heif|avif)$/i;

export type ProductImageAltInput = {
  altEn?: string | null;
  altTh?: string | null;
  nameEn?: string | null;
  nameTh?: string | null;
  compositionEn?: string | null;
  compositionTh?: string | null;
};

export type ProductImageAltPair = {
  altEn: string;
  altTh: string;
};

function trimText(value: string | null | undefined): string {
  return (value ?? '').trim();
}

export function isWeakProductImageAlt(value: string | null | undefined): boolean {
  const text = trimText(value);
  if (!text) return true;
  if (GENERIC_ALTS.has(text.toLowerCase())) return true;
  if (FILENAME_EXT_RE.test(text)) return true;
  return false;
}

export function truncateProductImageAlt(value: string, maxLength = PRODUCT_IMAGE_ALT_MAX_LENGTH): string {
  const text = value.trim();
  if (text.length <= maxLength) return text;
  const sliced = text.slice(0, maxLength);
  const lastSpace = sliced.lastIndexOf(' ');
  if (lastSpace >= Math.floor(maxLength * 0.6)) {
    return sliced.slice(0, lastSpace).trim();
  }
  return sliced.trim();
}

function composeEnglishAlt(name: string, composition: string): string {
  if (!name && !composition) return '';
  if (!composition) return name;
  if (!name) return composition;
  const lowerName = name.toLowerCase();
  const lowerComposition = composition.toLowerCase();
  if (lowerComposition.startsWith(lowerName) || lowerComposition.includes(lowerName)) {
    return composition;
  }
  return `${name} with ${composition}`;
}

function composeThaiAlt(name: string, composition: string): string {
  if (!name && !composition) return '';
  if (!composition) return name;
  if (!name) return composition;
  if (composition.includes(name)) return composition;
  return `${name} ประกอบด้วย ${composition}`;
}

export function compositionFromCustomAttributes(
  attrs: Array<{ key?: string; value?: string }> | null | undefined
): { compositionEn: string; compositionTh: string } {
  const list = attrs ?? [];
  const valueFor = (key: string) =>
    list.find((item) => item.key === key)?.value?.trim() ?? '';
  return {
    compositionEn: valueFor('composition_en'),
    compositionTh: valueFor('composition_th'),
  };
}

export function buildProductImageAlt(input: ProductImageAltInput): ProductImageAltPair {
  const nameEn = trimText(input.nameEn);
  const nameTh = trimText(input.nameTh);
  const compositionEn = trimText(input.compositionEn);
  const compositionTh = trimText(input.compositionTh);

  const composedEn = truncateProductImageAlt(composeEnglishAlt(nameEn, compositionEn));
  const composedTh = truncateProductImageAlt(composeThaiAlt(nameTh, compositionTh));

  return {
    altEn: isWeakProductImageAlt(input.altEn)
      ? composedEn
      : truncateProductImageAlt(trimText(input.altEn)),
    altTh: isWeakProductImageAlt(input.altTh)
      ? composedTh
      : truncateProductImageAlt(trimText(input.altTh)),
  };
}

export function catalogImageAltLocale(lang?: string | null): 'en' | 'th' {
  return lang === 'th' ? 'th' : 'en';
}

export function localizedProductImageAlt(
  input: ProductImageAltInput,
  locale: 'en' | 'th' = 'en'
): string {
  const { altEn, altTh } = buildProductImageAlt(input);
  if (locale === 'th') return altTh || altEn;
  return altEn || altTh;
}

export function pickStoredImageAlt(
  stored: { alt?: string | null; alt_th?: string | null },
  locale: 'en' | 'th',
  fallback: ProductImageAltPair
): string {
  const en = trimText(stored.alt);
  const th = trimText(stored.alt_th);
  const preferred = locale === 'th' ? th : en;
  const other = locale === 'th' ? en : th;
  if (!isWeakProductImageAlt(preferred)) return preferred;
  if (!isWeakProductImageAlt(other)) return other;
  return locale === 'th' ? fallback.altTh || fallback.altEn : fallback.altEn || fallback.altTh;
}
