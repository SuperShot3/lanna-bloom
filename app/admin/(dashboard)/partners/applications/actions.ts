'use server';

import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import { createCatalogPartner } from '@/lib/catalogWrite';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { getPartnerApplicationById, updatePartnerApplication, deletePartnerApplication } from '@/lib/supabase/partnerQueries';
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
