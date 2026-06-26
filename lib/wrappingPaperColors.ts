import type { Locale } from '@/lib/i18n';

export const WRAPPING_PAPER_COLOR_IDS = [
  'none',
  'white',
  'pink',
  'red',
  'cream',
  'sage',
  'black',
] as const;

export type WrappingPaperColorId = (typeof WRAPPING_PAPER_COLOR_IDS)[number];

/** Cart / PDP selection: null = untouched default (florist's choice, hidden in admin). */
export type WrappingPaperColorSelection = WrappingPaperColorId | null;

export type WrappingPaperColorOption = {
  id: WrappingPaperColorId;
  nameEn: string;
  nameTh: string;
  /** Filled swatch hex; omitted for florist's choice. */
  hex?: string;
};

export const WRAPPING_PAPER_COLORS: WrappingPaperColorOption[] = [
  { id: 'none', nameEn: "Florist's choice", nameTh: 'ตามที่ร้านเลือก' },
  { id: 'white', nameEn: 'White', nameTh: 'ขาว', hex: '#FFFFFF' },
  { id: 'pink', nameEn: 'Pink', nameTh: 'ชมพู', hex: '#F4B4C4' },
  { id: 'red', nameEn: 'Red', nameTh: 'แดง', hex: '#C62828' },
  { id: 'cream', nameEn: 'Cream', nameTh: 'ครีม', hex: '#F5E6D3' },
  { id: 'sage', nameEn: 'Sage green', nameTh: 'เขียวอ่อน', hex: '#9CAF88' },
  { id: 'black', nameEn: 'Black', nameTh: 'ดำ', hex: '#212121' },
];

const COLOR_BY_ID = new Map(WRAPPING_PAPER_COLORS.map((c) => [c.id, c]));

export function isWrappingPaperColorId(value: unknown): value is WrappingPaperColorId {
  return typeof value === 'string' && WRAPPING_PAPER_COLOR_IDS.includes(value as WrappingPaperColorId);
}

export function isSpecificWrappingPaperColor(
  value: WrappingPaperColorSelection | string | null | undefined
): value is Exclude<WrappingPaperColorId, 'none'> {
  return isWrappingPaperColorId(value) && value !== 'none';
}

export function getWrappingPaperColorOption(
  id: WrappingPaperColorId | null | undefined
): WrappingPaperColorOption | undefined {
  if (!id) return undefined;
  return COLOR_BY_ID.get(id);
}

export function getWrappingPaperColorLabel(
  id: WrappingPaperColorId | string | null | undefined,
  lang: Locale
): string {
  const option = isWrappingPaperColorId(id) ? COLOR_BY_ID.get(id) : undefined;
  if (!option) return '';
  return lang === 'th' ? option.nameTh : option.nameEn;
}

export function getWrappingPaperColorHex(
  id: WrappingPaperColorId | string | null | undefined
): string | undefined {
  const option = isWrappingPaperColorId(id) ? COLOR_BY_ID.get(id) : undefined;
  return option?.hex;
}

/** Normalize API / order_json value; unknown strings become null. */
export function normalizeWrappingPaperColor(
  value: unknown
): WrappingPaperColorId | null {
  if (value == null || value === '') return null;
  return isWrappingPaperColorId(value) ? value : null;
}
