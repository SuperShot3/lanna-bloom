import 'server-only';

import { createGoogleAdsCustomer } from '../googleAdsCustomer';
import type { GoogleAdsAssetSummary } from './types';

export async function listGoogleAdsImageAssets(): Promise<GoogleAdsAssetSummary[]> {
  const { customer } = await createGoogleAdsCustomer();

  const query = `
    SELECT
      asset.resource_name,
      asset.name,
      asset.type,
      asset.image_asset.full_size.url
    FROM asset
    WHERE asset.type = 'IMAGE'
    ORDER BY asset.name
    LIMIT 100
  `;

  try {
    const rows = await customer.query(query);
    const assets: GoogleAdsAssetSummary[] = [];
    for (const row of rows) {
      const asset = row.asset;
      if (!asset?.resource_name) continue;
      assets.push({
        resourceName: asset.resource_name,
        name: asset.name ?? 'Unnamed image',
        type: String(asset.type ?? 'IMAGE'),
        imageUrl: asset.image_asset?.full_size?.url ?? undefined,
      });
    }
    return assets;
  } catch {
    return [];
  }
}

export function validateAssetResourceNames(
  selected: string[],
  available: GoogleAdsAssetSummary[],
): { ok: boolean; invalid: string[] } {
  const availableSet = new Set(available.map((a) => a.resourceName));
  const invalid = selected.filter((name) => !availableSet.has(name));
  return { ok: invalid.length === 0, invalid };
}

export async function fetchAndValidateAssetResourceNames(
  selected: string[],
): Promise<{ ok: boolean; invalid: string[] }> {
  if (selected.length === 0) return { ok: true, invalid: [] };
  const available = await listGoogleAdsImageAssets();
  return validateAssetResourceNames(selected, available);
}
