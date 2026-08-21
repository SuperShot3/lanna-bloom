'use server';

import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import { createCatalogPartner, syncCatalogPartnerFromApplication } from '@/lib/catalogWrite';
import { getProvinceByCode } from '@/lib/provinces/queries';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import {
  getPartnerApplicationById,
  insertPartnerApplication,
  updatePartnerApplication,
  deletePartnerApplication,
  type PartnerApplicationRow,
  type UpdatePartnerApplicationFieldsInput,
} from '@/lib/supabase/partnerQueries';
import { isValidGoogleMapsUrl } from '@/lib/googleMapsUrl';
import { canChangeStatus } from '@/lib/adminRbac';
import {
  displayPartnerLoginPhone,
  isPartnerPhoneLoginEmail,
  partnerAuthEmailFromPhone,
} from '@/lib/partnerLogin';
import { randomBytes } from 'crypto';

function generateTempPassword(): string {
  return randomBytes(16).toString('base64url').slice(0, 16);
}

async function resolveProvinceCityFallback(provinceCode: string | null | undefined): Promise<string | null> {
  if (!provinceCode?.trim()) return null;
  const result = await getProvinceByCode(provinceCode.trim());
  if (!result.ok) return null;
  return result.province.province_name_en;
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

  const phone = app.phone?.trim();
  if (!phone) return { error: 'Phone is required to create a partner login' };

  const loginEmail = partnerAuthEmailFromPhone(phone);
  if (!loginEmail) {
    return { error: 'Enter a valid phone number to use as the partner login' };
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) return { error: 'Supabase not configured' };

  const tempPassword = generateTempPassword();
  const contactEmail = app.email?.trim() || undefined;

  const { data: userData, error: createUserError } = await supabase.auth.admin.createUser({
    email: loginEmail,
    password: tempPassword,
    email_confirm: true,
    user_metadata: {
      partner_login: 'phone',
      partner_login_phone: displayPartnerLoginPhone(phone),
      contact_email: contactEmail ?? null,
    },
  });

  if (createUserError) {
    console.error('[Partner] createUser failed:', createUserError);
    const msg = createUserError.message.toLowerCase();
    if (msg.includes('already') || msg.includes('registered') || msg.includes('exists')) {
      return { error: 'A partner login already exists for this phone number' };
    }
    return { error: createUserError.message };
  }

  const supabaseUserId = userData?.user?.id;
  if (!supabaseUserId) return { error: 'Failed to create user' };

  const provinceName = await resolveProvinceCityFallback(app.province_code);

  let catalogPartnerId: string;
  try {
    catalogPartnerId = await createCatalogPartner({
      shopName: app.shop_name ?? '',
      contactName: app.contact_name ?? '',
      phoneNumber: app.phone ?? '',
      lineOrWhatsapp: app.line_id ?? undefined,
      shopAddress: app.address ?? undefined,
      city: app.district?.trim() || provinceName || 'Chiang Mai',
      provinceCode: app.province_code ?? undefined,
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
  google_maps_url: string;
  district: string;
  province_code: string;
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

const MAX_PARTNER_MAPS_URL_LEN = 1000;

function parseOptionalGoogleMapsUrl(
  raw: string
): { ok: true; url: string | null } | { ok: false; error: string } {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: true, url: null };
  if (trimmed.length > MAX_PARTNER_MAPS_URL_LEN) {
    return { ok: false, error: 'Google Maps link is too long' };
  }
  if (!isValidGoogleMapsUrl(trimmed)) {
    return {
      ok: false,
      error: 'Enter a valid Google Maps link (maps.app.goo.gl or google.com/maps)',
    };
  }
  const withScheme = /^[a-zA-Z][a-zA-Z+\-.]*:\/\//.test(trimmed) ? trimmed : `https://${trimmed}`;
  return { ok: true, url: withScheme };
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
  const provinceCode = fields.province_code.trim();

  if (!shopName || !contactName || !phone) {
    return { error: 'Shop name, contact name, and phone are required' };
  }

  const mapsUrl = parseOptionalGoogleMapsUrl(fields.google_maps_url);
  if (!mapsUrl.ok) return { error: mapsUrl.error };

  if (provinceCode) {
    const provinceResult = await getProvinceByCode(provinceCode);
    if (!provinceResult.ok) {
      return { error: 'Invalid province' };
    }
  }

  const isApproved = app.status === 'approved';

  const patch: UpdatePartnerApplicationFieldsInput = {
    shop_name: shopName,
    contact_name: contactName,
    email: email || null,
    phone,
    line_id: fields.line_id.trim() || null,
    instagram: fields.instagram.trim() || null,
    facebook: fields.facebook.trim() || null,
    address: fields.address.trim() || null,
    google_maps_url: mapsUrl.url,
    district: fields.district.trim() || null,
    province_code: provinceCode || null,
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

  if (isApproved && app.user_id && phone !== (app.phone ?? '').trim()) {
    const loginEmail = partnerAuthEmailFromPhone(phone);
    if (!loginEmail) {
      return { error: 'Enter a valid phone number to use as the partner login' };
    }
    const supabase = getSupabaseAdmin();
    if (!supabase) return { error: 'Supabase not configured' };

    const { data: userData, error: getUserError } = await supabase.auth.admin.getUserById(app.user_id);
    if (getUserError) {
      console.error('[Partner] getUserById failed:', getUserError);
      return { error: 'Failed to load partner login' };
    }
    const currentAuthEmail = userData.user?.email ?? '';
    if (isPartnerPhoneLoginEmail(currentAuthEmail) && currentAuthEmail !== loginEmail) {
      const { error: updateAuthError } = await supabase.auth.admin.updateUserById(app.user_id, {
        email: loginEmail,
        email_confirm: true,
        user_metadata: {
          ...(userData.user?.user_metadata ?? {}),
          partner_login: 'phone',
          partner_login_phone: displayPartnerLoginPhone(phone),
          contact_email: email || null,
        },
      });
      if (updateAuthError) {
        console.error('[Partner] updateUserById email failed:', updateAuthError);
        const msg = updateAuthError.message.toLowerCase();
        if (msg.includes('already') || msg.includes('registered') || msg.includes('exists')) {
          return { error: 'A partner login already exists for this phone number' };
        }
        return { error: updateAuthError.message };
      }
    }
  }

  const ok = await updatePartnerApplication(applicationId, patch);
  if (!ok) return { error: 'Failed to update application' };

  if (isApproved && app.sanity_partner_id) {
    try {
      const provinceName = await resolveProvinceCityFallback(patch.province_code);
      await syncCatalogPartnerFromApplication(app.sanity_partner_id, {
        shop_name: patch.shop_name,
        contact_name: patch.contact_name,
        phone: patch.phone,
        line_id: patch.line_id,
        address: patch.address,
        district: patch.district,
        province_code: patch.province_code,
        city: patch.district?.trim() || provinceName || 'Chiang Mai',
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

export async function createPartnerApplicationAction(
  fields: PartnerApplicationFieldsPayload,
  options?: { approveImmediately?: boolean }
): Promise<{ error?: string; application?: PartnerApplicationRow; tempPassword?: string }> {
  const session = await auth();
  if (!session?.user || !canChangeStatus((session.user as { role?: string }).role)) {
    return { error: 'Forbidden' };
  }

  const shopName = fields.shop_name.trim();
  const contactName = fields.contact_name.trim();
  const email = fields.email.trim();
  const phone = fields.phone.trim();
  const provinceCode = fields.province_code.trim();
  const approveImmediately = options?.approveImmediately === true;

  if (!shopName || !contactName || !phone) {
    return { error: 'Shop name, contact name, and phone are required' };
  }

  if (!provinceCode) {
    return { error: 'Province is required' };
  }

  const mapsUrl = parseOptionalGoogleMapsUrl(fields.google_maps_url);
  if (!mapsUrl.ok) return { error: mapsUrl.error };

  const provinceResult = await getProvinceByCode(provinceCode);
  if (!provinceResult.ok) {
    return { error: 'Invalid province' };
  }

  if (approveImmediately && !partnerAuthEmailFromPhone(phone)) {
    return { error: 'Enter a valid phone number to use as the partner login' };
  }

  let applicationId: string;
  try {
    applicationId = await insertPartnerApplication({
      shop_name: shopName,
      contact_name: contactName,
      email: email || undefined,
      phone,
      line_id: fields.line_id.trim() || undefined,
      instagram: fields.instagram.trim() || undefined,
      facebook: fields.facebook.trim() || undefined,
      address: fields.address.trim() || undefined,
      google_maps_url: mapsUrl.url || undefined,
      district: fields.district.trim() || undefined,
      province_code: provinceCode,
      lat: parseOptionalCoord(fields.lat) ?? undefined,
      lng: parseOptionalCoord(fields.lng) ?? undefined,
      self_deliver: fields.self_deliver,
      delivery_zones: fields.delivery_zones.trim() || undefined,
      delivery_fee_note: fields.delivery_fee_note.trim() || undefined,
      categories: parseCategories(fields.categories),
      prep_time: fields.prep_time.trim() || undefined,
      cutoff_time: fields.cutoff_time.trim() || undefined,
      max_orders_per_day: parseOptionalNumber(fields.max_orders_per_day) ?? undefined,
      sample_photo_urls: parseSamplePhotoUrls(fields.sample_photo_urls),
      experience_note: fields.experience_note.trim() || undefined,
      admin_note: fields.admin_note.trim() || undefined,
      status: 'pending',
    });
  } catch (err) {
    console.error('[Partner] createPartnerApplication failed:', err);
    return { error: err instanceof Error ? err.message : 'Failed to create partner' };
  }

  if (approveImmediately) {
    const approveResult = await approvePartnerApplicationAction(applicationId);
    if (approveResult.error) {
      const application = await getPartnerApplicationById(applicationId);
      revalidatePath('/admin/partners/applications');
      return {
        error: `Saved as pending, but approval failed: ${approveResult.error}`,
        application: application ?? undefined,
      };
    }
    const application = await getPartnerApplicationById(applicationId);
    revalidatePath('/admin/partners/applications');
    return {
      application: application ?? undefined,
      tempPassword: approveResult.tempPassword,
    };
  }

  const application = await getPartnerApplicationById(applicationId);
  revalidatePath('/admin/partners/applications');
  return { application: application ?? undefined };
}
