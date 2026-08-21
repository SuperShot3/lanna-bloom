import 'server-only';

import type { BouquetSellableOption } from '@/lib/bouquetOptions';
import {
  getCatalogImageVariantKey,
  getCatalogProductImagesForEntity,
} from '@/lib/catalogCms';
import { isStorefrontRenderableImageUrl } from '@/lib/catalog/catalogImage';
import { isCatalogImageAiGenerated } from '@/lib/catalog/imageAiGenerated';
import { isStorefrontCatalogImage } from '@/lib/catalog/storefrontImages';
import { catalogPublicUrl, type CatalogSupabaseClient } from '@/lib/catalog/storage';
import { stemVariantKey, type PricingType } from '@/lib/catalog/pricing';
import type { CatalogProductImageRow } from '@/lib/catalog/types';

export type VariantImageSet = { urls: string[]; alts: string[]; aiGenerated: boolean[] };

function rowsToUrls(
  supabase: CatalogSupabaseClient,
  rows: CatalogProductImageRow[]
): VariantImageSet {
  const sorted = [...rows].sort(
    (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || Number(b.is_primary) - Number(a.is_primary)
  );
  const urls: string[] = [];
  const alts: string[] = [];
  const aiGenerated: boolean[] = [];
  for (const row of sorted) {
    if (!row.storage_path || !isStorefrontCatalogImage({ storage_path: row.storage_path, metadata: row.metadata })) {
      continue;
    }
    const publicUrl = row.public_url?.trim();
    const resolved =
      publicUrl && isStorefrontRenderableImageUrl(publicUrl)
        ? publicUrl
        : catalogPublicUrl(supabase, row.storage_path);
    if (!isStorefrontRenderableImageUrl(resolved)) continue;
    urls.push(resolved);
    alts.push(row.alt_en?.trim() || row.alt_th?.trim() || '');
    aiGenerated.push(isCatalogImageAiGenerated(row.source_type));
  }
  return { urls, alts, aiGenerated };
}

/** Load main + per-variant image sets for a bouquet PDP. */
export async function loadBouquetVariantImages(
  supabase: CatalogSupabaseClient,
  bouquetId: string
): Promise<{ main: VariantImageSet; byVariantKey: Map<string, VariantImageSet> }> {
  const rows = await getCatalogProductImagesForEntity('bouquet', bouquetId);
  const mainRows: CatalogProductImageRow[] = [];
  const byVariantKey = new Map<string, CatalogProductImageRow[]>();

  for (const row of rows) {
    const vk = getCatalogImageVariantKey(row);
    if (!vk) {
      mainRows.push(row);
      continue;
    }
    const list = byVariantKey.get(vk) ?? [];
    list.push(row);
    byVariantKey.set(vk, list);
  }

  const byVariant = new Map<string, VariantImageSet>();
  for (const [vk, list] of Array.from(byVariantKey.entries())) {
    byVariant.set(vk, rowsToUrls(supabase, list));
  }

  return { main: rowsToUrls(supabase, mainRows), byVariantKey: byVariant };
}

export function attachVariantImagesToSellableOptions(
  sizes: BouquetSellableOption[],
  pricingType: PricingType,
  byVariantKey: Map<string, VariantImageSet>
): BouquetSellableOption[] {
  if (!byVariantKey.size) return sizes;

  return sizes.map((opt) => {
    const candidates: string[] = [];
    if (pricingType === 'size_based') {
      // Fixed bouquets store CMS images under variantKey; optionId is `fixed_<variantKey>`.
      // Classic size rows use key s/m/l/xl.
      const optionId = opt.optionId?.trim() ?? '';
      if (optionId.toLowerCase().startsWith('fixed_')) {
        candidates.push(optionId.slice('fixed_'.length));
      }
      if (opt.key) candidates.push(opt.key);
    } else if (pricingType === 'stem_count' && opt.stemCount != null) {
      candidates.push(stemVariantKey(opt.stemCount));
    }

    let set: VariantImageSet | undefined;
    for (const vk of candidates) {
      if (!vk) continue;
      const hit = byVariantKey.get(vk);
      if (hit?.urls.length) {
        set = hit;
        break;
      }
    }
    if (!set?.urls.length) return opt;
    return {
      ...opt,
      imageUrls: set.urls,
      imageAlts: set.alts,
      imageAiGenerated: set.aiGenerated,
    };
  });
}
