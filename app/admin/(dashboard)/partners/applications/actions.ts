'use server';

import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import { createCatalogPartner, syncCatalogPartnerFromApplication } from '@/lib/catalogWrite';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import {
  getPartnerApplicationById,
  updatePartnerApplication,
  deletePartnerApplication,
  type UpdatePartnerApplicationFieldsInput,
} from '@/lib/supabase/partnerQueries';
import { canChangeStatus } from '@/lib/adminRbac';
import { randomBytes } from 'crypto';

function generateTempPassword(): string {
  return randomBytes(16).toString('base64url').slice(0, 16);
}

export async function approvePartnerApplicationAction(
  applicationId: string
): Promise<{ error?: string; tempPassword?: string }> {
  const session = await auth();
  if (!session?.user || !canChangeStatus((session.user as { role?: string }).role)) {
    return { error: 'Forbidden' };
  }

  const app = await getPartnerApplicationById(applicationId);
  if (!app) return { error: 'Application not found' };
  if (app.status !== 'pending') return { error: 'Application already processed' };

  const email = app.email?.trim();
  if (!email) return { error: 'Application has no email' };

  const supabase = getSupabaseAdmin();
  if (!supabase) return { error: 'Supabase not configured' };

  const tempPassword = generateTempPassword();

  const { data: userData, error: createUserError } = await supabase.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
  });

  if (createUserError) {
    console.error('[Partner] createUser failed:', createUserError);
    return { error: createUserError.message };
  }

  const supabaseUserId = userData?.user?.id;
  if (!supabaseUserId) return { error: 'Failed to create user' };

  let catalogPartnerId: string;
  try {
    catalogPartnerId = await createCatalogPartner({
      shopName: app.shop_name ?? '',
      contactName: app.contact_name ?? '',
      phoneNumber: app.phone ?? '',
      lineOrWhatsapp: app.line_id ?? undefined,
      shopAddress: app.address ?? undefined,
      city: 'Chiang Mai',
      supabaseUserId,
    });
  } catch (err) {
    console.error('[Partner] createCatalogPartner failed:', err);
    return { error: err instanceof Error ? err.message : 'Failed to create partner' };
  }

  const ok = await updatePartnerApplication(applicationId, {
    status: 'approved',
    user_id: supabaseUserId,
    sanity_partner_id: catalogPartnerId,
    temp_password: tempPassword,
  });
  if (!ok) return { error: 'Failed to update application' };

  revalidatePath('/admin/partners/applications');
  return { tempPassword };
}

export async function reissuePartnerPasswordAction(
  applicationId: string
): Promise<{ error?: string; tempPassword?: string }> {
  const session = await auth();
  if (!session?.user || !canChangeStatus((session.user as { role?: string }).role)) {
    return { error: 'Forbidden' };
  }

  const app = await getPartnerApplicationById(applicationId);
  if (!app) return { error: 'Application not found' };
  if (app.status !== 'approved') return { error: 'Only approved partners can have password re-issued' };
  const userId = app.user_id;
  if (!userId) return { error: 'Application has no linked user' };

  const supabase = getSupabaseAdmin();
  if (!supabase) return { error: 'Supabase not configured' };

  const tempPassword = generateTempPassword();

  const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
    password: tempPassword,
  });

  if (updateError) {
    console.error('[Partner] updateUserById failed:', updateError);
    return { error: updateError.message };
  }

  const ok = await updatePartnerApplication(applicationId, {
    temp_password: tempPassword,
  });
  if (!ok) return { error: 'Failed to save password' };

  revalidatePath('/admin/partners/applications');
  return { tempPassword };
}

export async function rejectPartnerApplicationAction(
  applicationId: string,
  adminNote?: string
): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user || !canChangeStatus((session.user as { role?: string }).role)) {
    return { error: 'Forbidden' };
  }

  const app = await getPartnerApplicationById(applicationId);
  if (!app) return { error: 'Application not found' };
  if (app.status !== 'pending') return { error: 'Application already processed' };

  const ok = await updatePartnerApplication(applicationId, {
    status: 'rejected',
    admin_note: adminNote ?? null,
  });
  if (!ok) return { error: 'Failed to update application' };

  revalidatePath('/admin/partners/applications');
  return {};
}

export async function deletePartnerApplicationAction(
  applicationId: string
): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user || !canChangeStatus((session.user as { role?: string }).role)) {
    return { error: 'Forbidden' };
  }

  const app = await getPartnerApplicationById(applicationId);
  if (!app) return { error: 'Application not found' };

  const userId = app.status === 'approved' ? app.user_id : null;

  const ok = await deletePartnerApplication(applicationId);
  if (!ok) return { error: 'Failed to delete application' };

  if (userId) {
    const supabase = getSupabaseAdmin();
    if (supabase) {
      const { error: deleteUserError } = await supabase.auth.admin.deleteUser(userId);
      if (deleteUserError) {
        console.error('[Partner] deleteUser failed (application already deleted):', deleteUserError);
        return { error: `Partner removed, but could not revoke login: ${deleteUserError.message}` };
      }
    }
  }

  revalidatePath('/admin/partners/applications');
  return {};
}

export type PartnerApplicationFieldsPayload = {
  shop_name: string;
  contact_name: string;
  email: string;
  phone: string;
  line_id: string;
  instagram: string;
  facebook: string;
  address: string;
  district: string;
  lat: string;
  lng: string;
  self_deliver: boolean;
  delivery_zones: string;
  delivery_fee_note: string;
  categories: string;
  prep_time: string;
  cutoff_time: string;
  max_orders_per_day: string;
  sample_photo_urls: string;
  experience_note: string;
  admin_note: string;
};

function parseSamplePhotoUrls(raw: string): string[] {
  return raw
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter((s) => s.startsWith('http://') || s.startsWith('https://'));
}

function parseCategories(raw: string): string[] {
  if (!raw.trim()) return [];
  return raw
    .split(/[,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseOptionalNumber(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

function parseOptionalCoord(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

export async function updatePartnerApplicationFieldsAction(
  applicationId: string,
  fields: PartnerApplicationFieldsPayload
): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user || !canChangeStatus((session.user as { role?: string }).role)) {
    return { error: 'Forbidden' };
  }

  const app = await getPartnerApplicationById(applicationId);
  if (!app) return { error: 'Application not found' };

  const shopName = fields.shop_name.trim();
  const contactName = fields.contact_name.trim();
  const email = fields.email.trim();
  const phone = fields.phone.trim();

  if (!shopName || !contactName || !phone) {
    return { error: 'Shop name, contact name, and phone are required' };
  }

  const isApproved = app.status === 'approved';
  if (!isApproved && !email) {
    return { error: 'Email is required' };
  }

  const patch: UpdatePartnerApplicationFieldsInput = {
    shop_name: shopName,
    contact_name: contactName,
    phone,
    line_id: fields.line_id.trim() || null,
    instagram: fields.instagram.trim() || null,
    facebook: fields.facebook.trim() || null,
    address: fields.address.trim() || null,
    district: fields.district.trim() || null,
    lat: parseOptionalCoord(fields.lat),
    lng: parseOptionalCoord(fields.lng),
    self_deliver: fields.self_deliver,
    delivery_zones: fields.delivery_zones.trim() || null,
    delivery_fee_note: fields.delivery_fee_note.trim() || null,
    categories: parseCategories(fields.categories),
    prep_time: fields.prep_time.trim() || null,
    cutoff_time: fields.cutoff_time.trim() || null,
    max_orders_per_day: parseOptionalNumber(fields.max_orders_per_day),
    sample_photo_urls: parseSamplePhotoUrls(fields.sample_photo_urls),
    experience_note: fields.experience_note.trim() || null,
    admin_note: fields.admin_note.trim() || null,
  };

  if (!isApproved) {
    patch.email = email;
  }

  const ok = await updatePartnerApplication(applicationId, patch);
  if (!ok) return { error: 'Failed to update application' };

  if (isApproved && app.sanity_partner_id) {
    try {
      await syncCatalogPartnerFromApplication(app.sanity_partner_id, {
        shop_name: patch.shop_name,
        contact_name: patch.contact_name,
        phone: patch.phone,
        line_id: patch.line_id,
        address: patch.address,
        district: patch.district,
      });
    } catch (err) {
      console.error('[Partner] syncCatalogPartnerFromApplication failed:', err);
      return {
        error:
          'Application saved, but storefront partner profile failed to sync. Please try again or update catalog manually.',
      };
    }
  }

  revalidatePath('/admin/partners/applications');
  return {};
}
