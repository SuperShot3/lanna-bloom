'use server';

import { redirect } from 'next/navigation';
import { insertPartnerApplication } from '@/lib/supabase/partnerQueries';
import { isValidLocale } from '@/lib/i18n';
import { CATEGORY_OPTIONS } from '@/lib/partnerPortal';

const PRESET_CATEGORY_VALUES: Set<string> = new Set(
  CATEGORY_OPTIONS.map((c) => c.value as string)
);

function isValidCategoryEntry(s: string): boolean {
  const t = s.trim();
  if (!t || t.length > 120) return false;
  if (t.startsWith('custom:')) {
    const rest = t.slice('custom:'.length).trim();
    return rest.length > 0 && rest.length <= 100;
  }
  return PRESET_CATEGORY_VALUES.has(t);
}

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

  const shopName = (formData.get('shopName') as string)?.trim();
  const contactName = (formData.get('contactName') as string)?.trim();
  const email = (formData.get('email') as string)?.trim();
  const lineId = (formData.get('lineId') as string)?.trim();
  const phone = (formData.get('phone') as string)?.trim();
  const instagram = (formData.get('instagram') as string)?.trim();
  const facebook = (formData.get('facebook') as string)?.trim();
  const address = (formData.get('address') as string)?.trim();
  const district = (formData.get('district') as string)?.trim();
  const selfDeliver = formData.get('selfDeliver') === 'true';
  const deliveryZones = (formData.get('deliveryZones') as string)?.trim();
  const deliveryFee = (formData.get('deliveryFee') as string)?.trim();
  const categoriesRaw = formData.get('categories') as string;
  const prepTime = (formData.get('prepTime') as string)?.trim();
  const cutoff = (formData.get('cutoff') as string)?.trim();
  const maxOrdersRaw = formData.get('maxOrders') as string;
  const portfolioLinksRaw = (formData.get('portfolioLinks') as string)?.trim();
  const experienceNote = (formData.get('experienceNote') as string)?.trim();

  const samplePhotoUrls: string[] = [];
  if (portfolioLinksRaw) {
    const links = portfolioLinksRaw.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean);
    for (const link of links) {
      if (link.startsWith('http://') || link.startsWith('https://')) samplePhotoUrls.push(link);
    }
  }

  let categories: string[] = [];
  if (categoriesRaw) {
    try {
      const parsed = JSON.parse(categoriesRaw);
      if (Array.isArray(parsed)) {
        categories = parsed
          .filter((x): x is string => typeof x === 'string')
          .map((x) => x.trim())
          .filter(isValidCategoryEntry)
          .slice(0, 3);
      }
    } catch {
      categories = [];
    }
  }

  if (categories.length === 0) {
    return { error: 'Please select at least one category.' };
  }

  const maxOrders = maxOrdersRaw ? parseInt(maxOrdersRaw, 10) : undefined;

  if (!shopName || !contactName || !email || !lineId || !phone) {
    return { error: 'Shop name, contact name, email, LINE ID, and phone are required' };
  }

  try {
    const id = await insertPartnerApplication({
      shop_name: shopName,
      contact_name: contactName,
      email,
      line_id: lineId,
      phone,
      address: address || undefined,
      district: district || undefined,
      instagram: instagram || undefined,
      facebook: facebook || undefined,
      self_deliver: selfDeliver,
      delivery_zones: deliveryZones || undefined,
      delivery_fee_note: deliveryFee || undefined,
      categories: categories.length ? categories : undefined,
      prep_time: prepTime || undefined,
      cutoff_time: cutoff || undefined,
      max_orders_per_day: maxOrders && !isNaN(maxOrders) ? maxOrders : undefined,
      sample_photo_urls: samplePhotoUrls.length ? samplePhotoUrls : undefined,
      experience_note: experienceNote || undefined,
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
