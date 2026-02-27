'use server';

import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { getPartnerApplicationById, updatePartnerApplication, deletePartnerApplication } from '@/lib/supabase/partnerQueries';
import { createPartner } from '@/lib/sanityWrite';
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

  let sanityPartnerId: string;
  try {
    sanityPartnerId = await createPartner({
      shopName: app.shop_name ?? '',
      contactName: app.contact_name ?? '',
      phoneNumber: app.phone ?? '',
      lineOrWhatsapp: app.line_id ?? undefined,
      shopAddress: app.address ?? undefined,
      city: 'Chiang Mai',
      supabaseUserId,
    });
  } catch (err) {
    console.error('[Partner] createPartner failed:', err);
    return { error: err instanceof Error ? err.message : 'Failed to create partner' };
  }

  const ok = await updatePartnerApplication(applicationId, {
    status: 'approved',
    user_id: supabaseUserId,
    sanity_partner_id: sanityPartnerId,
  });
  if (!ok) return { error: 'Failed to update application' };

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
  if (app.status !== 'rejected') {
    return { error: 'Only rejected applications can be deleted' };
  }

  const ok = await deletePartnerApplication(applicationId);
  if (!ok) return { error: 'Failed to delete application' };

  revalidatePath('/admin/partners/applications');
  return {};
}
