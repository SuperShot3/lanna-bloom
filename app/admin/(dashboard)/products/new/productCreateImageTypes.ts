export type ImageVariant = {
  assetId: string;
  url?: string;
  format: 'webp' | 'png_master';
  isPrimary: boolean;
  alt?: string;
};

export type ImageDraft = {
  id: string;
  file: File;
  localPreview: string;
  variants: ImageVariant[];
  serverPreview?: string;
  isPrimary: boolean;
};

export function parseVariants(value: unknown): ImageVariant[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry): ImageVariant | null => {
      if (!entry || typeof entry !== 'object') return null;
      const row = entry as Record<string, unknown>;
      const assetId = typeof row.assetId === 'string' ? row.assetId : '';
      if (!assetId) return null;
      const format = row.format === 'png_master' ? 'png_master' : 'webp';
      return {
        assetId,
        url: typeof row.url === 'string' ? row.url : undefined,
        format,
        isPrimary: row.isPrimary === true,
        alt: typeof row.alt === 'string' ? row.alt : undefined,
      };
    })
    .filter((variant): variant is ImageVariant => variant != null);
}

export function hasReadyWebp(draft: { variants?: ImageVariant[] }): boolean {
  return (draft.variants ?? []).some((variant) => variant.format === 'webp' && variant.assetId);
}

export function getWebpPreview(draft: {
  serverPreview?: string;
  localPreview: string;
  variants?: ImageVariant[];
}): string {
  if (draft.serverPreview) return draft.serverPreview;
  const webp = (draft.variants ?? []).find((variant) => variant.format === 'webp');
  if (webp?.url) return webp.url;
  return draft.localPreview;
}
