/** Map a sellable option index to a gallery slide when counts differ (e.g. many stem counts, few photos). */
export function imageIndexForSizeIndex(sizeIndex: number, imageCount: number): number {
  if (imageCount <= 0) return 0;
  return Math.min(Math.max(0, Math.floor(sizeIndex)), imageCount - 1);
}

/** Map a gallery slide index to a sellable option when counts differ. */
export function sizeIndexForImageIndex(imageIndex: number | undefined, sizeCount: number): number | null {
  if (imageIndex == null || sizeCount <= 0) return null;
  return Math.min(Math.max(0, Math.floor(imageIndex)), sizeCount - 1);
}

export function clampGalleryIndex(index: number, imageCount: number): number {
  if (imageCount <= 0) return 0;
  return Math.min(Math.max(0, Math.floor(index)), imageCount - 1);
}
