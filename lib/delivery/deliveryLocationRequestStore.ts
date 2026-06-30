import 'server-only';

import { createSharedCart } from '@/lib/cart/sharedCart';
import type { ValidatedDeliveryLocationRequest } from '@/lib/delivery/deliveryLocationRequestValidate';
import { sendDeliveryLocationRequestAdminEmail } from '@/lib/delivery/deliveryLocationRequestEmail';
import { getSupabaseAdmin } from '@/lib/supabase/server';

export type DeliveryLocationRequestResult = {
  requestId: string;
  sharedCartUrl: string | null;
};

export async function createDeliveryLocationRequest(
  data: ValidatedDeliveryLocationRequest
): Promise<DeliveryLocationRequestResult> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    throw new Error('Database is not configured');
  }

  let sharedCartToken: string | null = null;
  let sharedCartUrl: string | null = null;
  try {
    const shared = await createSharedCart({ items: data.items, locale: data.lang });
    sharedCartToken = shared.token;
    sharedCartUrl = shared.url;
  } catch (err) {
    console.error('[deliveryLocationRequest] shared cart failed', err);
  }

  const { data: row, error } = await supabase
    .from('delivery_location_requests')
    .insert({
      lang: data.lang,
      location_text: data.locationText,
      google_maps_url: data.googleMapsUrl,
      customer_name: data.customerName,
      customer_phone: data.customerPhone,
      customer_email: data.customerEmail,
      consent_accepted_at: data.consentAcceptedAt,
      shared_cart_token: sharedCartToken,
      shared_cart_url: sharedCartUrl,
      cart_items_json: data.items,
      submission_channel: data.submissionChannel,
      source_path: data.sourcePath,
      user_agent: data.userAgent,
      status: 'new',
    })
    .select('id')
    .single();

  if (error || !row?.id) {
    console.error('[deliveryLocationRequest] insert failed', error);
    throw new Error('Could not save delivery request');
  }

  const requestId = String(row.id);

  try {
    await sendDeliveryLocationRequestAdminEmail({
      requestId,
      data,
      sharedCartUrl,
    });
  } catch (err) {
    console.error('[deliveryLocationRequest] admin email failed', err);
  }

  return { requestId, sharedCartUrl };
}
