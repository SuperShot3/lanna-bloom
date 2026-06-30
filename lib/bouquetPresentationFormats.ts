export const BOUQUET_PRESENTATION_FORMAT_OPTIONS = [
  { title: 'Bouquet', value: 'bouquet' },
  { title: 'Box', value: 'box' },
  { title: 'Vase', value: 'vase' },
  { title: 'Basket', value: 'basket' },
  { title: 'Arrangement', value: 'arrangement' },
  { title: 'Potted', value: 'potted' },
] as const;

export type BouquetPresentationFormat = (typeof BOUQUET_PRESENTATION_FORMAT_OPTIONS)[number]['value'];

/** True when `presentationFormats` includes potted. */
export function bouquetHasPottedPresentation(b: { presentationFormats?: string[] }): boolean {
  return (b.presentationFormats ?? []).includes('potted');
}

const CUT_FLOWER_PRESENTATION_FORMATS = ['bouquet', 'box', 'vase', 'basket', 'arrangement'] as const;

/** Potted plant only — no cut-flower bouquet / box / vase tags on the same product. */
export function bouquetIsPottedOnly(b: { presentationFormats?: string[] }): boolean {
  const formats = b.presentationFormats ?? [];
  if (!formats.includes('potted')) return false;
  return !formats.some((format) =>
    CUT_FLOWER_PRESENTATION_FORMATS.includes(format as (typeof CUT_FLOWER_PRESENTATION_FORMATS)[number])
  );
}
