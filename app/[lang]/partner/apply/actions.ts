'use server';

import { redirect } from 'next/navigation';
import { insertPartnerApplication } from '@/lib/supabase/partnerQueries';
import { isValidLocale } from '@/lib/i18n';
import { getProvinceByCode } from '@/lib/provinces/queries';
import { validatePartnerApplyFields } from '@/lib/partnerApplyValidate';

function isRedirectError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'digest' in err &&
    typeof (err as { digest?: string }).digest === 'string' &&
    (err as { digest: string }).digest.startsWith('NEXT_REDIRECT')
  );
}

export async function applyPartnerAction(formData: FormData) {
  const lang = formData.get('lang') as string;
  if (!isValidLocale(lang)) {
    return { error: 'Invalid locale' };
  }

  const shopName = (formData.get('shopName') as string) ?? '';
  const provinceCode = (formData.get('provinceCode') as string) ?? '';
  const phone = (formData.get('phone') as string) ?? '';
  const lineId = (formData.get('lineId') as string) ?? '';
  const email = (formData.get('email') as string) ?? '';
  const experienceNote = (formData.get('experienceNote') as string) ?? '';

  const provinceResult = provinceCode.trim()
    ? await getProvinceByCode(provinceCode.trim())
    : null;

  const validated = validatePartnerApplyFields(
    { shopName, provinceCode, phone, lineId, email, experienceNote },
    { provinceExists: Boolean(provinceResult?.ok) }
  );

  if (!validated.ok) {
    return { error: validated.error };
  }

  const data = validated.data;

  try {
    const id = await insertPartnerApplication({
      shop_name: data.shopName,
      email: data.email || undefined,
      line_id: data.lineId || undefined,
      phone: data.phone || undefined,
      province_code: data.provinceCode,
      experience_note: data.experienceNote || undefined,
      status: 'pending',
    });
    redirect(`/${lang}/partner/apply/success?id=${encodeURIComponent(id)}`);
  } catch (err) {
    if (isRedirectError(err)) throw err;
    console.error('[Partner] Apply failed:', err);
    return {
      error: err instanceof Error ? err.message : 'Application failed. Please try again.',
    };
  }
}
