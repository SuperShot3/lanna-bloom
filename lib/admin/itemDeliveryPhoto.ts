import 'server-only';

import { getSupabaseAdmin } from '@/lib/supabase/server';

export const ORDER_ITEM_DELIVERY_PHOTO_BUCKET = 'receipts';
export const ORDER_ITEM_DELIVERY_PHOTO_PREFIX = 'order-item-delivery-photos';
export const ORDER_ITEM_DELIVERY_PHOTO_SIGNED_TTL_SECONDS = 60 * 15;

export type OrderItemDeliveryPhotoRow = {
  id: string;
  order_id: string;
  delivery_photo_path: string | null;
};

export function isOrderItemDeliveryPhotoStoragePath(orderId: string, itemId: string, path: string): boolean {
  const prefix = `${ORDER_ITEM_DELIVERY_PHOTO_PREFIX}/${orderId}/${itemId}-`;
  return path.startsWith(prefix);
}

export function buildOrderItemDeliveryPhotoStoragePath(orderId: string, itemId: string, ext: string): string {
  return `${ORDER_ITEM_DELIVERY_PHOTO_PREFIX}/${orderId}/${itemId}-${crypto.randomUUID()}.${ext}`;
}

export async function getOrderItemForDeliveryPhoto(
  orderId: string,
  itemId: string
): Promise<{ ok: true; item: OrderItemDeliveryPhotoRow } | { ok: false; error: string; status: number }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return { ok: false, error: 'Supabase not configured', status: 503 };
  }

  const { data, error } = await supabase
    .from('order_items')
    .select('id, order_id, delivery_photo_path')
    .eq('order_id', orderId)
    .eq('id', itemId)
    .maybeSingle();

  if (error) {
    return { ok: false, error: error.message, status: 500 };
  }
  if (!data) {
    return { ok: false, error: 'Item not found', status: 404 };
  }

  return {
    ok: true,
    item: {
      id: String(data.id),
      order_id: String(data.order_id),
      delivery_photo_path: typeof data.delivery_photo_path === 'string' ? data.delivery_photo_path : null,
    },
  };
}

export async function createOrderItemDeliveryPhotoSignedUrl(
  path: string,
  download = false
): Promise<{ ok: true; signedUrl: string } | { ok: false; error: string; status: number }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return { ok: false, error: 'Storage not configured', status: 503 };
  }
  const fileName = path.split('/').pop() ?? 'delivery-photo.jpg';
  const { data, error } = await supabase.storage
    .from(ORDER_ITEM_DELIVERY_PHOTO_BUCKET)
    .createSignedUrl(path, ORDER_ITEM_DELIVERY_PHOTO_SIGNED_TTL_SECONDS, {
      download: download ? fileName : undefined,
    });
  if (error || !data?.signedUrl) {
    console.error('[item-delivery-photo] signed URL error:', error?.message);
    return { ok: false, error: 'Failed to generate photo URL', status: 500 };
  }
  return { ok: true, signedUrl: data.signedUrl };
}
