/** Unique photo playlist for catalog-card desktop hover cycling. */

/** Same duration as the home hero progress fill (`HeroFeatureCarousel`). */
export const CATALOG_CARD_HOVER_GALLERY_MS = 3000;

function uniqueTrimmedUrls(urls: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of urls) {
    const url = typeof raw === 'string' ? raw.trim() : '';
    if (!url || seen.has(url)) continue;
    seen.add(url);
    out.push(url);
  }
  return out;
}

/**
 * Unique gallery URLs. If the currently shown size photo is not already in the
 * gallery, it is prepended so hover starts from what the customer already sees.
 * Gallery order is otherwise preserved.
 */
export function buildCatalogCardHoverPlaylist(params: {
  gallery: Array<string | null | undefined>;
  currentSrc?: string | null;
}): string[] {
  const gallery = uniqueTrimmedUrls(params.gallery);
  const current = params.currentSrc?.trim() || '';
  if (!current) return gallery;
  if (gallery.includes(current)) return gallery;
  return [current, ...gallery];
}

export function catalogCardHoverStartIndex(
  playlist: readonly string[],
  currentSrc?: string | null
): number {
  const current = currentSrc?.trim() || '';
  if (!current || playlist.length === 0) return 0;
  const index = playlist.indexOf(current);
  return index >= 0 ? index : 0;
}

export function altForCatalogCardHoverImage(
  gallery: readonly string[],
  alts: readonly string[] | undefined,
  src: string,
  fallback: string
): string {
  const index = gallery.indexOf(src);
  if (index >= 0) {
    const alt = alts?.[index]?.trim();
    if (alt) return alt;
  }
  return alts?.[0]?.trim() || fallback;
}
