import 'server-only';

import { getSupabaseAdmin } from '@/lib/supabase/server';
import {
  selectablePartnerShops,
  type CatalogPartnerShop,
} from '@/lib/admin/catalogPartnerShopTypes';

export type { CatalogPartnerShop };
export { selectablePartnerShops } from '@/lib/admin/catalogPartnerShopTypes';

export async function listCatalogPartnerShops(): Promise<CatalogPartnerShop[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  const { data: applications, error: applicationsError } = await supabase
    .from('partner_applications')
    .select('status, sanity_partner_id')
    .eq('status', 'approved')
    .not('sanity_partner_id', 'is', null);

  if (applicationsError) {
    console.error('[catalogPartnerShops] list applications failed:', applicationsError.message);
    return [];
  }

  const links = (applications ?? []).map((row) => ({
    status: typeof row.status === 'string' ? row.status : null,
    catalogPartnerId:
      typeof row.sanity_partner_id === 'string' ? row.sanity_partner_id : null,
  }));

  const partnerIds = Array.from(
    new Set(
      links
        .map((link) => link.catalogPartnerId?.trim() ?? '')
        .filter(Boolean)
    )
  );
  if (partnerIds.length === 0) return [];

  const { data: partners, error: partnersError } = await supabase
    .from('catalog_partners')
    .select('id, shop_name, status, legacy_sanity_id')
    .in('id', partnerIds);

  if (partnersError) {
    console.error('[catalogPartnerShops] list partners failed:', partnersError.message);
    return [];
  }

  return selectablePartnerShops(
    links,
    (partners ?? []).map((row) => ({
      id: String(row.id ?? ''),
      name: String(row.shop_name ?? ''),
      status: typeof row.status === 'string' ? row.status : null,
      legacySanityId:
        typeof row.legacy_sanity_id === 'string' ? row.legacy_sanity_id : null,
    }))
  );
}

export async function findCatalogPartnerShop(partnerId: string): Promise<CatalogPartnerShop | null> {
  const id = partnerId.trim();
  if (!id) return null;
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('catalog_partners')
    .select('id, shop_name')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('[catalogPartnerShops] find failed:', error.message);
    return null;
  }
  if (!data) return null;
  const name = String(data.shop_name ?? '').trim();
  if (!name) return null;
  return { id: String(data.id), name };
}

export async function findSelectableCatalogPartnerShop(
  partnerId: string
): Promise<CatalogPartnerShop | null> {
  const id = partnerId.trim();
  if (!id) return null;
  const shops = await listCatalogPartnerShops();
  return shops.find((shop) => shop.id === id) ?? null;
}
