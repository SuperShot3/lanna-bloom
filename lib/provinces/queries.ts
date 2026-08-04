import 'server-only';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import type { ProvinceRow, ProvinceUpdateInput, PublicProvince } from './types';
import { toPublicProvince } from './validate';

function mapRow(row: Record<string, unknown>): ProvinceRow {
  return {
    id: String(row.id),
    province_code: String(row.province_code),
    province_name_en: String(row.province_name_en),
    province_name_th: String(row.province_name_th),
    topojson_property_value: (row.topojson_property_value as string | null) ?? null,
    destination_id: (row.destination_id as string | null) ?? null,
    status: row.status as ProvinceRow['status'],
    catalog_enabled: Boolean(row.catalog_enabled),
    min_advance_notice_hours:
      typeof row.min_advance_notice_hours === 'number' ? row.min_advance_notice_hours : null,
    same_day_cutoff_local: (row.same_day_cutoff_local as string | null) ?? null,
    customer_message_en: (row.customer_message_en as string | null) ?? null,
    customer_message_th: (row.customer_message_th as string | null) ?? null,
    delivery_limitations_en: (row.delivery_limitations_en as string | null) ?? null,
    delivery_limitations_th: (row.delivery_limitations_th as string | null) ?? null,
    available_categories: Array.isArray(row.available_categories)
      ? (row.available_categories as string[])
      : null,
    seo_page_status: row.seo_page_status as ProvinceRow['seo_page_status'],
    internal_notes: (row.internal_notes as string | null) ?? null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export async function listProvinces(opts?: {
  status?: string;
}): Promise<{ ok: true; provinces: ProvinceRow[] } | { ok: false; error: string }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false, error: 'Database not configured' };

  let query = supabase.from('provinces').select('*').order('province_name_en', { ascending: true });
  if (opts?.status && opts.status !== 'all') {
    query = query.eq('status', opts.status);
  }

  const { data, error } = await query;
  if (error) {
    console.error('[provinces] listProvinces failed:', error.message);
    return { ok: false, error: error.message };
  }
  return { ok: true, provinces: (data ?? []).map((r) => mapRow(r as Record<string, unknown>)) };
}

export async function getProvinceByCode(
  code: string
): Promise<{ ok: true; province: ProvinceRow } | { ok: false; error: string }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false, error: 'Database not configured' };

  const { data, error } = await supabase
    .from('provinces')
    .select('*')
    .eq('province_code', code)
    .maybeSingle();

  if (error) {
    console.error('[provinces] getProvinceByCode failed:', error.message);
    return { ok: false, error: error.message };
  }
  if (!data) return { ok: false, error: 'Not found' };
  return { ok: true, province: mapRow(data as Record<string, unknown>) };
}

export async function updateProvince(
  code: string,
  patch: ProvinceUpdateInput
): Promise<{ ok: true; province: ProvinceRow } | { ok: false; error: string }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false, error: 'Database not configured' };

  const { data, error } = await supabase
    .from('provinces')
    .update(patch)
    .eq('province_code', code)
    .select('*')
    .maybeSingle();

  if (error) {
    console.error('[provinces] updateProvince failed:', error.message);
    return { ok: false, error: error.message };
  }
  if (!data) return { ok: false, error: 'Not found' };
  return { ok: true, province: mapRow(data as Record<string, unknown>) };
}

export async function getProvinceByDestinationId(
  destinationId: string
): Promise<{ ok: true; province: ProvinceRow } | { ok: false; error: string }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false, error: 'Database not configured' };

  const dest = destinationId.trim();
  if (!dest) return { ok: false, error: 'Not found' };

  const { data, error } = await supabase
    .from('provinces')
    .select('*')
    .eq('destination_id', dest)
    .maybeSingle();

  if (error) {
    console.error('[provinces] getProvinceByDestinationId failed:', error.message);
    return { ok: false, error: error.message };
  }
  if (!data) return { ok: false, error: 'Not found' };
  return { ok: true, province: mapRow(data as Record<string, unknown>) };
}

export async function getPublicProvinceByDestinationId(
  destinationId: string
): Promise<{ ok: true; province: PublicProvince } | { ok: false; error: string }> {
  const result = await getProvinceByDestinationId(destinationId);
  if (!result.ok) return result;
  return {
    ok: true,
    province: toPublicProvince(result.province as unknown as Record<string, unknown>),
  };
}

export async function listPublicProvinces(): Promise<
  { ok: true; provinces: PublicProvince[] } | { ok: false; error: string }
> {
  const result = await listProvinces();
  if (!result.ok) return result;
  return {
    ok: true,
    provinces: result.provinces.map((p) => toPublicProvince(p as unknown as Record<string, unknown>)),
  };
}

export async function getPublicProvinceByCode(
  code: string
): Promise<{ ok: true; province: PublicProvince } | { ok: false; error: string }> {
  const result = await getProvinceByCode(code);
  if (!result.ok) return result;
  return {
    ok: true,
    province: toPublicProvince(result.province as unknown as Record<string, unknown>),
  };
}
