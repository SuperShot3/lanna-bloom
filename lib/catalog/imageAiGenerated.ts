import type { CatalogImageSourceType } from '@/lib/catalog/types';

export function isCatalogImageAiGenerated(
  sourceType: string | null | undefined
): boolean {
  return sourceType === 'ai_generated';
}

export function parseCatalogImageSourceType(
  value: unknown
): CatalogImageSourceType | undefined {
  if (value === 'uploaded' || value === 'ai_generated' || value === 'migrated_from_sanity') {
    return value;
  }
  return undefined;
}

export function catalogImageSourceTypeFromFlag(
  aiGenerated: boolean
): Extract<CatalogImageSourceType, 'uploaded' | 'ai_generated'> {
  return aiGenerated ? 'ai_generated' : 'uploaded';
}

export function imageAiGeneratedFlags(
  sourceTypes: Array<string | null | undefined>
): boolean[] {
  return sourceTypes.map(isCatalogImageAiGenerated);
}

/** True only for this photo URL — never a product-wide flag. */
export function isImageUrlAiGenerated(
  imageUrl: string | undefined,
  sources: Array<{ images?: string[]; imageAiGenerated?: boolean[] | null }>
): boolean {
  const url = imageUrl?.trim();
  if (!url) return false;
  for (const source of sources) {
    const images = source.images ?? [];
    const flags = source.imageAiGenerated ?? [];
    const index = images.findIndex((candidate) => candidate === url);
    if (index >= 0) return flags[index] === true;
  }
  return false;
}
