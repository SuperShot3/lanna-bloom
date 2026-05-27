import type { AdminCatalogProductImage } from '@/lib/catalog/types';

/** Reorder scoped images in-place while preserving non-scoped items. */
export function reorderImagesByIds(
  allImages: AdminCatalogProductImage[],
  orderedIds: string[],
  variantKey: string | null
): AdminCatalogProductImage[] {
  const inScope = (img: AdminCatalogProductImage) =>
    variantKey != null ? img.variantKey === variantKey : !img.variantKey;

  const byId = new Map(allImages.filter(inScope).map((img) => [img.id, img]));
  const reorderedScoped = orderedIds.map((id, index) => {
    const img = byId.get(id);
    if (!img) throw new Error(`Unknown image id: ${id}`);
    return { ...img, sortOrder: index };
  });

  const firstScopedIdx = allImages.findIndex(inScope);
  if (firstScopedIdx === -1) {
    return [...allImages, ...reorderedScoped];
  }

  const withoutScoped = allImages.filter((img) => !inScope(img));
  const insertAt = firstScopedIdx;
  return [
    ...withoutScoped.slice(0, insertAt),
    ...reorderedScoped,
    ...withoutScoped.slice(insertAt),
  ];
}
