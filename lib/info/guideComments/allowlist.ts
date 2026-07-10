import { articles } from '@/app/[lang]/info/_data/articles';
import { GUIDE_SLUG_RE, MAX_GUIDE_SLUG_LENGTH } from './constants';

/** Bespoke guide pages that are not MDX articles but accept comments. */
export const BESPOKE_GUIDE_SLUGS = [
  'birthday-flower-gift',
  'flowers-chiang-mai',
  'perfect-bouquet-someone-special',
] as const;

let cachedSlugs: Set<string> | null = null;

export function getCommentableGuideSlugs(): Set<string> {
  if (cachedSlugs) return cachedSlugs;
  const slugs = new Set(articles.map((a) => a.slug));
  for (const slug of BESPOKE_GUIDE_SLUGS) {
    slugs.add(slug);
  }
  cachedSlugs = slugs;
  return slugs;
}

export function isCommentableGuideSlug(raw: string): boolean {
  const slug = raw.trim().toLowerCase();
  if (!slug || slug.length > MAX_GUIDE_SLUG_LENGTH) return false;
  if (!GUIDE_SLUG_RE.test(slug)) return false;
  return getCommentableGuideSlugs().has(slug);
}
