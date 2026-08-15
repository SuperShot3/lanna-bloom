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

/** Size → shared-gallery slide (same clamp as the PDP). */
export function galleryIndexForSize(sizeIndex: number, imageCount: number): number {
  return imageIndexForSizeIndex(sizeIndex, imageCount);
}

/**
 * Slide → size. When several sizes share one photo (fewer images than variants),
 * keep the currently selected size if it already maps to this slide.
 */
export function sizeIndexForGalleryIndex(
  imageIndex: number,
  sizeCount: number,
  imageCount: number,
  currentSizeIndex?: number | null
): number | null {
  if (sizeCount <= 0 || imageCount <= 0) return null;
  const slide = clampGalleryIndex(imageIndex, imageCount);
  if (
    currentSizeIndex != null &&
    currentSizeIndex >= 0 &&
    currentSizeIndex < sizeCount &&
    imageIndexForSizeIndex(currentSizeIndex, imageCount) === slide
  ) {
    return currentSizeIndex;
  }
  return sizeIndexForImageIndex(slide, sizeCount);
}

/** Card / 1-click thumb: per-size photo, else the mapped shared-gallery slide. */
export function catalogCardImageForSize(params: {
  images: string[];
  sizeIndex: number;
  sizeImageUrls?: string[] | null;
}): { url: string; galleryIndex: number } {
  const images = params.images.filter((u) => typeof u === 'string' && u.trim().length > 0);
  const galleryIndex = galleryIndexForSize(params.sizeIndex, images.length);
  const fromSize = params.sizeImageUrls?.find((u) => typeof u === 'string' && u.trim().length > 0)?.trim();
  if (fromSize) return { url: fromSize, galleryIndex };
  const url = images[galleryIndex] ?? images[0] ?? '';
  return { url, galleryIndex };
}
