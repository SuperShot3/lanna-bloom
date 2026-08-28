import { CATALOG_SYSTEM_PARTNER_LEGACY_ID } from '@/lib/catalog/types';

export type CatalogPartnerShop = {
  id: string;
  name: string;
};

export type ApprovedApplicationShopLink = {
  status: string | null;
  catalogPartnerId: string | null;
};

export type CatalogPartnerShopRow = {
  id: string;
  name: string;
  status: string | null;
  legacySanityId: string | null;
};

/** Dropdown shops: approved applications with a live (non-disabled, non-system) catalog partner. */
export function selectablePartnerShops(
  applications: ApprovedApplicationShopLink[],
  partners: CatalogPartnerShopRow[],
  systemPartnerLegacyId: string = CATALOG_SYSTEM_PARTNER_LEGACY_ID
): CatalogPartnerShop[] {
  const approvedIds = new Set<string>();
  for (const app of applications) {
    if (app.status !== 'approved') continue;
    const id = app.catalogPartnerId?.trim();
    if (id) approvedIds.add(id);
  }

  const byId = new Map<string, CatalogPartnerShop>();
  for (const partner of partners) {
    const id = partner.id.trim();
    const name = partner.name.trim();
    if (!id || !name) continue;
    if (!approvedIds.has(id)) continue;
    if (partner.status === 'disabled') continue;
    if ((partner.legacySanityId ?? '').trim() === systemPartnerLegacyId) continue;
    if (byId.has(id)) continue;
    byId.set(id, { id, name });
  }

  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name, 'en'));
}
