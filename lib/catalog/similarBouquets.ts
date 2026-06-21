import type { Bouquet } from '@/lib/bouquets';
import { bouquetIsAvailableForDestination } from '@/lib/bouquetDestinationAvailability';
import { orderPopularBouquetsWithFeaturedFirst } from '@/lib/catalogListLogic';

function intersectCount(a: string[] | undefined, b: string[] | undefined): number {
  if (!a?.length || !b?.length) return 0;
  const setB = new Set(b);
  return a.filter((v) => setB.has(v)).length;
}

export function scoreSimilarity(source: Bouquet, candidate: Bouquet): number {
  let score = 0;
  score += intersectCount(source.colors, candidate.colors) * 10;
  score += intersectCount(source.flowerTypes, candidate.flowerTypes) * 5;
  score += intersectCount(source.occasion, candidate.occasion) * 3;
  score += intersectCount(source.presentationFormats, candidate.presentationFormats) * 2;
  if (candidate.featuredPopular) score += 1;
  return score;
}

export function pickSimilarBouquets(
  source: Bouquet,
  candidates: Bouquet[],
  limit = 3
): Bouquet[] {
  if (limit <= 0) return [];

  const eligible = candidates.filter(
    (b) =>
      b.id !== source.id && bouquetIsAvailableForDestination(b, 'CHIANG_MAI')
  );

  const scored = eligible
    .map((b) => ({ bouquet: b, score: scoreSimilarity(source, b) }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return (a.bouquet.nameEn || '').localeCompare(b.bouquet.nameEn || '', undefined, {
        sensitivity: 'base',
      });
    });

  const picked: Bouquet[] = [];
  const pickedIds = new Set<string>();

  for (const { bouquet, score } of scored) {
    if (picked.length >= limit) break;
    if (score <= 0) break;
    if (pickedIds.has(bouquet.id)) continue;
    picked.push(bouquet);
    pickedIds.add(bouquet.id);
  }

  if (picked.length >= limit) return picked;

  const fallback = orderPopularBouquetsWithFeaturedFirst(eligible);
  for (const bouquet of fallback) {
    if (picked.length >= limit) break;
    if (pickedIds.has(bouquet.id)) continue;
    picked.push(bouquet);
    pickedIds.add(bouquet.id);
  }

  return picked;
}
