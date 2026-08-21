import 'server-only';

import { getSupabaseAdmin } from '@/lib/supabase/server';

export const ORDER_ITEM_PHOTO_BUCKET = 'receipts';
export const ORDER_ITEM_PHOTO_PREFIX = 'order-item-photos';
export const ORDER_ITEM_PHOTO_SIGNED_TTL_SECONDS = 60 * 15;

export type OrderItemPhotoRow = {
  id: string;
  order_id: string;
  purchase_photo_path: string | null;
  image_url_snapshot: string | null;
  bouquet_title: string | null;
};

export function isOrderItemPhotoStoragePath(orderId: string, itemId: string, path: string): boolean {
  const prefix = `${ORDER_ITEM_PHOTO_PREFIX}/${orderId}/${itemId}-`;
  return path.startsWith(prefix);
}

export function buildOrderItemPhotoStoragePath(orderId: string, itemId: string, ext: string): string {
  return `${ORDER_ITEM_PHOTO_PREFIX}/${orderId}/${itemId}-${crypto.randomUUID()}.${ext}`;
}

export async function getOrderItemForPhoto(
  orderId: string,
  itemId: string
): Promise<{ ok: true; item: OrderItemPhotoRow } | { ok: false; error: string; status: number }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return { ok: false, error: 'Supabase not configured', status: 503 };
  }

  const { data, error } = await supabase
    .from('order_items')
    .select('id, order_id, purchase_photo_path, image_url_snapshot, bouquet_title')
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
      purchase_photo_path: typeof data.purchase_photo_path === 'string' ? data.purchase_photo_path : null,
      image_url_snapshot: typeof data.image_url_snapshot === 'string' ? data.image_url_snapshot : null,
      bouquet_title: typeof data.bouquet_title === 'string' ? data.bouquet_title : null,
    },
  };
}

export async function createOrderItemPhotoSignedUrl(
  path: string,
  download = false
): Promise<{ ok: true; signedUrl: string } | { ok: false; error: string; status: number }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return { ok: false, error: 'Storage not configured', status: 503 };
  }
  const fileName = path.split('/').pop() ?? 'purchase-photo.jpg';
  const { data, error } = await supabase.storage
    .from(ORDER_ITEM_PHOTO_BUCKET)
    .createSignedUrl(path, ORDER_ITEM_PHOTO_SIGNED_TTL_SECONDS, {
      download: download ? fileName : undefined,
    });
  if (error || !data?.signedUrl) {
    console.error('[item-purchase-photo] signed URL error:', error?.message);
    return { ok: false, error: 'Failed to generate photo URL', status: 500 };
  }
  return { ok: true, signedUrl: data.signedUrl };
}
