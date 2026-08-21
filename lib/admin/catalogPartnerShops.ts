import 'server-only';

import { getSupabaseAdmin } from '@/lib/supabase/server';
import type { CatalogPartnerShop } from '@/lib/admin/catalogPartnerShopTypes';

export type { CatalogPartnerShop };

export async function listCatalogPartnerShops(): Promise<CatalogPartnerShop[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('catalog_partners')
    .select('id, shop_name, status')
    .neq('status', 'disabled')
    .order('shop_name', { ascending: true });

  if (error) {
    console.error('[catalogPartnerShops] list failed:', error.message);
    return [];
  }

  return (data ?? [])
    .map((row) => ({
      id: String(row.id),
      name: String(row.shop_name ?? '').trim(),
    }))
    .filter((row) => row.id && row.name);
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
