/**
 * Canonical admin CMS field options — aligned with storefront filters.
 */
import type { PricingType } from '@/lib/catalog/pricing';
import { BOUQUET_PRESENTATION_FORMAT_OPTIONS } from '@/lib/bouquetPresentationFormats';
import {
  DELIVERY_DESTINATIONS,
  destinationDisplayName,
  type DeliveryDestinationId,
} from '@/lib/delivery/markets';
import { catalogImageFormat } from '@/lib/catalog/storefrontImages';

export const ADMIN_DELIVERY_SPEED_OPTIONS = [
  { value: 'same_day', label: 'Same day' },
  { value: 'next_day', label: 'Next day' },
] as const;

export const ADMIN_COLOR_OPTIONS = [
  { value: 'red', label: 'Red' },
  { value: 'pink', label: 'Pink' },
  { value: 'white', label: 'White' },
  { value: 'yellow', label: 'Yellow' },
  { value: 'purple', label: 'Purple' },
  { value: 'orange', label: 'Orange' },
  { value: 'green', label: 'Green' },
  { value: 'mixed', label: 'Mixed' },
] as const;

export const ADMIN_FLOWER_TYPE_OPTIONS = [
  { value: 'rose', label: 'Rose' },
  { value: 'tulip', label: 'Tulip' },
  { value: 'lily', label: 'Lily' },
  { value: 'orchid', label: 'Orchid' },
  { value: 'sunflower', label: 'Sunflower' },
  { value: 'gerbera', label: 'Gerbera' },
  { value: 'carnation', label: 'Carnation' },
  { value: 'mums', label: 'Mums' },
  { value: 'chrysanthemums', label: 'Chrysanthemums' },
  { value: 'lisianthus', label: 'Lisianthus' },
  { value: 'daisy', label: 'Daisy' },
  { value: 'hydrangea', label: 'Hydrangea' },
  { value: 'mixed', label: 'Mixed' },
] as const;

export const ADMIN_OCCASION_OPTIONS = [
  { value: 'birthday', label: 'Birthday' },
  { value: 'anniversary', label: 'Anniversary' },
  { value: 'romantic', label: 'Romantic' },
  { value: 'sympathy', label: 'Sympathy' },
  { value: 'congrats', label: 'Congratulations' },
  { value: 'get_well', label: 'Get well' },
] as const;

export const ADMIN_PRICING_TYPE_OPTIONS: { value: PricingType; label: string; helper?: string }[] = [
  {
    value: 'single_price',
    label: 'Single price',
    helper: 'One price and one purchasable option.',
  },
  {
    value: 'size_based',
    label: 'Size-based (S / M / L / XL)',
    helper: 'Enable only the sizes you sell; optional label and image per size.',
  },
  {
    value: 'stem_count',
    label: 'Stem count',
    helper: 'Rose-style tiers (12 / 24 / 50 stems) with optional images per tier.',
  },
];

export const ADMIN_FORMAT_OPTIONS = BOUQUET_PRESENTATION_FORMAT_OPTIONS.map((o) => ({
  value: o.value,
  label: o.title,
}));

export const ADMIN_MARKET_OPTIONS: { value: DeliveryDestinationId; label: string }[] =
  DELIVERY_DESTINATIONS.map((id) => ({
    value: id,
    label: destinationDisplayName(id, 'en'),
  }));

export function availableMarketsFromExcluded(
  excluded: DeliveryDestinationId[] | undefined
): DeliveryDestinationId[] {
  const excludedSet = new Set(excluded ?? []);
  return DELIVERY_DESTINATIONS.filter((id) => !excludedSet.has(id));
}

export function excludedMarketsFromAvailable(
  available: DeliveryDestinationId[]
): DeliveryDestinationId[] {
  const availableSet = new Set(available);
  return DELIVERY_DESTINATIONS.filter((id) => !availableSet.has(id));
}

export function imageLabelFromPath(storagePath: string): string {
  const parts = storagePath.split('/').filter(Boolean);
  return parts[parts.length - 1] ?? storagePath;
}

/** Human-readable format badge for admin image rows. */
export function catalogImageFormatLabel(input: {
  format?: string | null;
  storagePath?: string;
}): string {
  const resolved = catalogImageFormat({
    storage_path: input.storagePath,
    format: input.format,
  });
  if (resolved === 'webp') return 'WEBP';
  if (resolved === 'png_master') return 'PNG';
  if (resolved === 'source') {
    const path = (input.storagePath ?? '').toLowerCase();
    if (path.endsWith('.jpg') || path.endsWith('.jpeg')) return 'JPEG';
    if (path.endsWith('.png')) return 'PNG';
    return 'SRC';
  }

  const path = (input.storagePath ?? '').toLowerCase();
  if (path.endsWith('.webp')) return 'WEBP';
  if (path.endsWith('.png')) return 'PNG';
  if (path.endsWith('.jpg') || path.endsWith('.jpeg')) return 'JPEG';

  const ext = path.split('.').pop();
  return ext ? ext.toUpperCase() : 'IMG';
}
