export const BOUQUET_PRESENTATION_FORMAT_OPTIONS = [
  { title: 'Bouquet', value: 'bouquet' },
  { title: 'Box', value: 'box' },
  { title: 'Vase', value: 'vase' },
  { title: 'Basket', value: 'basket' },
  { title: 'Arrangement', value: 'arrangement' },
  { title: 'Potted', value: 'potted' },
] as const;

export type BouquetPresentationFormat = (typeof BOUQUET_PRESENTATION_FORMAT_OPTIONS)[number]['value'];
