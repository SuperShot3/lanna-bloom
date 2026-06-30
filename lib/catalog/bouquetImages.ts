import 'server-only';

import type { BouquetSellableOption } from '@/lib/bouquetOptions';
import {
  getCatalogImageVariantKey,
  getCatalogProductImagesForEntity,
} from '@/lib/catalogCms';
import { isStorefrontRenderableImageUrl } from '@/lib/catalog/catalogImage';
import { isStorefrontCatalogImage } from '@/lib/catalog/storefrontImages';
import { catalogPublicUrl, type CatalogSupabaseClient } from '@/lib/catalog/storage';
import { stemVariantKey, type PricingType } from '@/lib/catalog/pricing';
import type { CatalogProductImageRow } from '@/lib/catalog/types';

export type VariantImageSet = { urls: string[]; alts: string[] };

function rowsToUrls(
  supabase: CatalogSupabaseClient,
  rows: CatalogProductImageRow[]
): VariantImageSet {
  const sorted = [...rows].sort(
    (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || Number(b.is_primary) - Number(a.is_primary)
  );
  const urls: string[] = [];
  const alts: string[] = [];
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
  }
  return { urls, alts };
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
    let vk: string | undefined;
    if (pricingType === 'size_based' && opt.key) {
      vk = opt.key;
    } else if (pricingType === 'stem_count' && opt.stemCount != null) {
      vk = stemVariantKey(opt.stemCount);
    }
    if (!vk) return opt;
    const set = byVariantKey.get(vk);
    if (!set?.urls.length) return opt;
    return { ...opt, imageUrls: set.urls, imageAlts: set.alts };
  });
}
