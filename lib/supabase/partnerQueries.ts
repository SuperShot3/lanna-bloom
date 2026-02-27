import 'server-only';
import { getSupabaseAdmin } from './server';

export interface PartnerApplicationRow {
  id: string;
  created_at: string | null;
  shop_name: string | null;
  contact_name: string | null;
  email: string | null;
  line_id: string | null;
  phone: string | null;
  instagram: string | null;
  facebook: string | null;
  address: string | null;
  district: string | null;
  lat: number | null;
  lng: number | null;
  self_deliver: boolean | null;
  delivery_zones: string | null;
  delivery_fee_note: string | null;
  categories: string[] | null;
  prep_time: string | null;
  cutoff_time: string | null;
  max_orders_per_day: number | null;
  sample_photo_urls: string[] | null;
  experience_note: string | null;
  status: string | null;
  admin_note: string | null;
  user_id: string | null;
  sanity_partner_id: string | null;
}

export interface InsertPartnerApplicationInput {
  shop_name: string;
  contact_name: string;
  email: string;
  line_id?: string;
  phone: string;
  address?: string;
  instagram?: string;
  facebook?: string;
  district?: string;
  lat?: number;
  lng?: number;
  self_deliver?: boolean;
  delivery_zones?: string;
  delivery_fee_note?: string;
  categories?: string[];
  prep_time?: string;
  cutoff_time?: string;
  max_orders_per_day?: number;
  sample_photo_urls?: string[];
  experience_note?: string;
  status?: 'pending' | 'draft';
}

/** Insert a new partner application. Returns id or throws. */
export async function insertPartnerApplication(
  input: InsertPartnerApplicationInput
): Promise<string> {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error('Supabase not configured');

  const { data, error } = await supabase
    .from('partner_applications')
    .insert({
      shop_name: input.shop_name,
      contact_name: input.contact_name,
      email: input.email,
      line_id: input.line_id ?? null,
      phone: input.phone,
      instagram: input.instagram ?? null,
      facebook: input.facebook ?? null,
      address: input.address ?? null,
      district: input.district ?? null,
      lat: input.lat ?? null,
      lng: input.lng ?? null,
      self_deliver: input.self_deliver ?? false,
      delivery_zones: input.delivery_zones ?? null,
      delivery_fee_note: input.delivery_fee_note ?? null,
      categories: input.categories ?? null,
      prep_time: input.prep_time ?? null,
      cutoff_time: input.cutoff_time ?? null,
      max_orders_per_day: input.max_orders_per_day ?? null,
      sample_photo_urls: input.sample_photo_urls ?? null,
      experience_note: input.experience_note ?? null,
      status: input.status ?? 'pending',
    })
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}

/** List partner applications, optionally filtered by status. */
export async function listPartnerApplications(status?: string): Promise<PartnerApplicationRow[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  let query = supabase
    .from('partner_applications')
    .select('*')
    .order('created_at', { ascending: false });

  if (status && status !== 'all') {
    query = query.eq('status', status);
  }

  const { data, error } = await query;
  if (error) {
    console.error('[Partner] listPartnerApplications failed:', error);
    return [];
  }
  return (data ?? []) as PartnerApplicationRow[];
}

/** Get single application by id. */
export async function getPartnerApplicationById(id: string): Promise<PartnerApplicationRow | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('partner_applications')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) return null;
  return data as PartnerApplicationRow;
}

/** Update application (admin): status, user_id, sanity_partner_id, admin_note. */
export async function updatePartnerApplication(
  id: string,
  updates: {
    status?: string;
    user_id?: string | null;
    sanity_partner_id?: string | null;
    admin_note?: string | null;
  }
): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return false;

  const { error } = await supabase
    .from('partner_applications')
    .update(updates)
    .eq('id', id);

  if (error) {
    console.error('[Partner] updatePartnerApplication failed:', error);
    return false;
  }
  return true;
}
