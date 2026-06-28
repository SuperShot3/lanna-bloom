import 'server-only';

import { getSupabaseAdmin } from '@/lib/supabase/server';
import {
  isCustomGuidanceCategory,
  normalizeCustomGuidanceKey,
  normalizeCustomGuidanceText,
} from './wizard/customGuidance';
import type {
  CustomGuidanceCategory,
  CustomGuidanceLibraryInput,
  CustomGuidanceLibraryItem,
} from './wizard/steps';

type GuidanceLibraryRow = {
  id: string;
  category: string;
  label: string;
  normalized_label: string;
  created_by_admin_email: string;
  created_at: string;
  updated_at: string;
};

function mapGuidanceLibraryRow(row: GuidanceLibraryRow): CustomGuidanceLibraryItem {
  return {
    id: row.id,
    category: row.category as CustomGuidanceCategory,
    label: row.label,
    createdByAdminEmail: row.created_by_admin_email,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listCustomGuidanceLibrary(): Promise<CustomGuidanceLibraryItem[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('marketing_campaign_guidance_library')
    .select('*')
    .order('category', { ascending: true })
    .order('label', { ascending: true });

  if (error || !data) return [];
  return (data as GuidanceLibraryRow[]).map(mapGuidanceLibraryRow);
}

export async function saveCustomGuidanceLibraryItem(input: {
  item: CustomGuidanceLibraryInput;
  adminEmail: string;
}): Promise<CustomGuidanceLibraryItem> {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error('Supabase not configured');
  if (!isCustomGuidanceCategory(input.item.category)) {
    throw new Error('Invalid guidance category');
  }

  const label = normalizeCustomGuidanceText(input.item.label).slice(0, 48);
  if (!label) throw new Error('Guidance label is required');

  const { data, error } = await supabase
    .from('marketing_campaign_guidance_library')
    .upsert(
      {
        category: input.item.category,
        label,
        normalized_label: normalizeCustomGuidanceKey(label),
        created_by_admin_email: input.adminEmail,
      },
      { onConflict: 'category,normalized_label' },
    )
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  return mapGuidanceLibraryRow(data as GuidanceLibraryRow);
}

export async function deleteCustomGuidanceLibraryItem(id: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return false;

  const { error } = await supabase
    .from('marketing_campaign_guidance_library')
    .delete()
    .eq('id', id);

  return !error;
}
