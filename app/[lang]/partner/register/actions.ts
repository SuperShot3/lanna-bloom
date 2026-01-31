'use server';

import { redirect } from 'next/navigation';
import { createPartner } from '@/lib/sanityWrite';
import { isValidLocale } from '@/lib/i18n';

/** Next.js redirect() throws an error with digest starting with NEXT_REDIRECT; rethrow so redirect works. */
function isRedirectError(err: unknown): boolean {
  return typeof err === 'object' && err !== null && 'digest' in err && typeof (err as { digest?: string }).digest === 'string' && (err as { digest: string }).digest.startsWith('NEXT_REDIRECT');
}

export async function registerPartnerAction(formData: FormData) {
  const lang = formData.get('lang') as string;
  if (!isValidLocale(lang)) {
    return { error: 'Invalid locale' };
  }
  const shopName = formData.get('shopName') as string;
  const contactName = formData.get('contactName') as string;
  const phoneNumber = formData.get('phoneNumber') as string;
  const lineOrWhatsapp = (formData.get('lineOrWhatsapp') as string) || undefined;
  const shopAddress = (formData.get('shopAddress') as string) || undefined;
  const city = (formData.get('city') as string) || 'Chiang Mai';

  if (!shopName?.trim() || !contactName?.trim() || !phoneNumber?.trim()) {
    return { error: 'Shop name, contact name, and phone number are required' };
  }

  try {
    const partnerId = await createPartner({
      shopName: shopName.trim(),
      contactName: contactName.trim(),
      phoneNumber: phoneNumber.trim(),
      lineOrWhatsapp: lineOrWhatsapp?.trim(),
      shopAddress: shopAddress?.trim(),
      city: city?.trim() || 'Chiang Mai',
    });
    redirect(`/${lang}/partner/register/success?id=${encodeURIComponent(partnerId)}`);
  } catch (err) {
    if (isRedirectError(err)) throw err;
    console.error('[Partner] Registration failed:', err);
    return {
      error: err instanceof Error ? err.message : 'Registration failed. Please try again.',
    };
  }
}
