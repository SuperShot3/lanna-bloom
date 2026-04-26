import 'server-only';
import { getBouquetById } from '@/lib/sanity';
import { getBaseUrl } from '@/lib/orders';
import type { Bouquet } from '@/lib/bouquets';

// Fallback: popular romantic bouquet in catalog
const FALLBACK_ID = '2b6319f2-a807-42c4-8aa0-49831220a637'; // 51 red roses
const MOM_PASTEL = '235fcea7-dc18-4605-8c07-783034fd313d'; // elegant classic mix
const FORMAL_ID = '63620ba7-b719-4654-aaa2-3d273f6d4614'; // elegant mix
const BRIGHT_ID = 'afe1ba0f-cf4e-4820-afdc-325f5a752289'; // 51 red & white
const ROMANTIC_ID = 'bb91f694-4feb-4c22-90b6-33e3001abe14'; // 51 pink roses

export function pickBouquetIdByRules(
  relationship: string,
  occasionType: string
): string {
  const rel = (relationship || '').toLowerCase();
  const occ = (occasionType || '').toLowerCase();

  if ((rel === 'wife_girlfriend' || rel === 'husband_boyfriend') && (occ === 'anniversary' || occ === 'valentine' || occ === 'birthday')) {
    return ROMANTIC_ID;
  }
  if (rel === 'mother' || rel === 'father') {
    return MOM_PASTEL;
  }
  if (rel === 'boss' || rel === 'colleague' || rel === 'client') {
    return FORMAL_ID;
  }
  if (rel === 'friend' && occ === 'birthday') {
    return BRIGHT_ID;
  }
  if (occ === 'mothers_day' || rel === 'mother') {
    return MOM_PASTEL;
  }
  return FALLBACK_ID;
}

function minPrice(b: Bouquet | null): number {
  if (!b?.sizes?.length) return 0;
  return Math.min(...b.sizes.map((s) => s.price ?? 0));
}

function priceLabel(n: number): string {
  if (n <= 0) return 'See our catalog for current prices';
  return `฿${n.toLocaleString()} onwards`;
}

export type RecommendedBouquet = {
  name: string;
  image: string;
  priceLabel: string;
  confirmUrl: string;
  chooseAnotherUrl: string;
  bouquetId: string;
};

export async function getRecommendedBouquetForReminder(
  relationship: string,
  occasionType: string
): Promise<RecommendedBouquet> {
  const id = pickBouquetIdByRules(relationship, occasionType);
  const b = await getBouquetById(id);
  const base = getBaseUrl().replace(/\/$/, '');
  const slug = b?.slug ?? '101-mixed-roses';
  return {
    bouquetId: b?.id ?? id,
    name: b?.nameEn?.trim() || 'A beautiful bouquet from Lanna Bloom',
    image: b?.images?.[0] || '',
    priceLabel: priceLabel(minPrice(b)),
    confirmUrl: `${base}/en/catalog/${encodeURIComponent(slug)}?src=reminder`,
    chooseAnotherUrl: `${base}/en/catalog`,
  };
}
