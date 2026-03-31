'use server';

import { redirect } from 'next/navigation';
import { updatePartnerProfile } from '@/lib/sanityWrite';
import { getPartnerSession } from '@/lib/supabase/partnerAuthServer';
import { getPartnerBySupabaseUserId } from '@/lib/sanity';
import { isValidLocale } from '@/lib/i18n';

function isRedirectError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'digest' in err &&
    typeof (err as { digest?: string }).digest === 'string' &&
    (err as { digest: string }).digest.startsWith('NEXT_REDIRECT')
  );
}

export async function updatePartnerProfileAction(formData: FormData) {
  const lang = formData.get('lang') as string;
  if (!isValidLocale(lang)) return { error: 'Invalid locale' };

  const session = await getPartnerSession();
  if (!session) return { error: 'Not authenticated' };

  const partner = await getPartnerBySupabaseUserId(session.user.id);
  if (!partner) return { error: 'Partner not found' };

  const phoneNumber = (formData.get('phoneNumber') as string)?.trim();
  if (!phoneNumber) return { error: 'Phone number is required' };

  try {
    await updatePartnerProfile(partner.id, {
      phoneNumber,
      lineOrWhatsapp: ((formData.get('lineOrWhatsapp') as string) ?? '').trim(),
      shopAddress: ((formData.get('shopAddress') as string) ?? '').trim(),
      city: ((formData.get('city') as string) ?? '').trim(),
      shopBioEn: ((formData.get('shopBioEn') as string) ?? '').trim(),
      shopBioTh: ((formData.get('shopBioTh') as string) ?? '').trim(),
    });
    redirect(`/${lang}/partner/shop`);
  } catch (err) {
    if (isRedirectError(err)) throw err;
    console.error('[Partner] updatePartnerProfile failed:', err);
    return { error: err instanceof Error ? err.message : 'Failed to save' };
  }
}

