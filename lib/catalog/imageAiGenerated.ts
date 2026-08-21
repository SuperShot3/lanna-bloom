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
