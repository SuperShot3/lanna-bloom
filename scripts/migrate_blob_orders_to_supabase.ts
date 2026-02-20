#!/usr/bin/env npx tsx
/**
 * One-time migration: copy orders from Vercel Blob to Supabase.
 *
 * Requires: BLOB_READ_WRITE_TOKEN, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 * Usage: npx tsx scripts/migrate_blob_orders_to_supabase.ts
 *
 * Safe to re-run: uses upsert on order_id.
 */

import { list } from '@vercel/blob';
import { nanoid } from 'nanoid';

const ORDERS_BLOB_PATH = 'lannabloom/orders.json';

async function main() {
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!blobToken) {
    console.error('Missing BLOB_READ_WRITE_TOKEN');
    process.exit(1);
  }
  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('Fetching Blob list...');
  const { blobs } = await list({ prefix: 'lannabloom/', limit: 100 });
  const blob = blobs.find(
    (b) =>
      b.pathname === ORDERS_BLOB_PATH ||
      b.pathname === ORDERS_BLOB_PATH.replace(/^\/+/, '') ||
      b.pathname?.endsWith('orders.json')
  );

  if (!blob?.url) {
    console.error('Blob orders.json not found');
    process.exit(1);
  }

  const res = await fetch(blob.url, { cache: 'no-store' });
  if (!res.ok) {
    console.error('Blob fetch failed:', res.status);
    process.exit(1);
  }

  const raw = await res.text();
  const orders = JSON.parse(raw);
  const orderList = Array.isArray(orders) ? orders : [];

  console.log(`Found ${orderList.length} orders in Blob`);

  let upserted = 0;
  let failed = 0;
  const BATCH_SIZE = 200;

  for (let i = 0; i < orderList.length; i += BATCH_SIZE) {
    const batch = orderList.slice(i, i + BATCH_SIZE);
    for (const order of batch) {
      const orderId = order.orderId ?? order.order_id;
      if (!orderId) {
        failed++;
        continue;
      }

      const paymentStatus =
        order.status === 'paid' ? 'PAID' : order.status === 'payment_failed' ? 'FAILED' : 'PENDING';
      const orderStatus = order.status === 'paid' ? 'PAID' : 'NEW';

      const row = {
        order_id: orderId,
        public_token: nanoid(21),
        order_json: order,
        payment_status: paymentStatus,
        order_status: orderStatus,
        paid_at: order.paidAt ?? order.paid_at ?? null,
        stripe_session_id: order.stripeSessionId ?? order.stripe_session_id ?? null,
        stripe_payment_intent_id: order.paymentIntentId ?? order.payment_intent_id ?? null,
        fulfillment_status: order.fulfillmentStatus ?? order.fulfillment_status ?? 'new',
        fulfillment_status_updated_at: order.fulfillmentStatusUpdatedAt ?? order.fulfillment_status_updated_at ?? new Date().toISOString(),
        created_at: order.createdAt ?? order.created_at ?? new Date().toISOString(),
        updated_at: new Date().toISOString(),
        customer_name: order.customerName ?? order.customer_name ?? null,
        customer_email: order.customerEmail ?? order.customer_email ?? null,
        phone: order.phone ?? null,
        address: order.delivery?.address ?? order.address ?? null,
        district: order.delivery?.deliveryDistrict ?? order.district ?? 'UNKNOWN',
        items_total: order.pricing?.itemsTotal ?? order.items_total ?? 0,
        delivery_fee: order.pricing?.deliveryFee ?? order.delivery_fee ?? 0,
        grand_total: order.pricing?.grandTotal ?? order.grand_total ?? 0,
        recipient_name: order.delivery?.recipientName ?? order.recipient_name ?? null,
        recipient_phone: order.delivery?.recipientPhone ?? order.recipient_phone ?? null,
        contact_preference: order.contactPreference
          ? JSON.stringify(order.contactPreference)
          : order.contact_preference ?? null,
        referral_code: order.referralCode ?? order.referral_code ?? null,
        referral_discount: order.referralDiscount ?? order.referral_discount ?? 0,
        payment_method: order.stripeSessionId || order.paymentIntentId ? 'STRIPE' : 'BANK_TRANSFER',
      };

      const { error } = await supabase.from('orders').upsert(row, {
        onConflict: 'order_id',
        ignoreDuplicates: false,
      });

      if (error) {
        console.error(`Failed ${orderId}:`, error.message);
        failed++;
      } else {
        upserted++;
      }
    }
    console.log(`Processed ${Math.min(i + BATCH_SIZE, orderList.length)} / ${orderList.length}`);
  }

  // Insert order_items for each order
  console.log('Inserting order_items...');
  for (const order of orderList) {
    const orderId = order.orderId ?? order.order_id;
    if (!orderId) continue;

    const items = order.items ?? [];
    if (items.length === 0) continue;

    await supabase.from('order_items').delete().eq('order_id', orderId);

    const itemsRows = items.map((item: Record<string, unknown>) => ({
      order_id: orderId,
      bouquet_id: String(item.bouquetId ?? item.bouquet_id ?? ''),
      bouquet_title: String(item.bouquetTitle ?? item.bouquet_title ?? ''),
      size: String(item.size ?? ''),
      price: Number(item.price ?? 0),
      image_url_snapshot: (item.imageUrl ?? item.image_url_snapshot) ? String(item.imageUrl ?? item.image_url_snapshot) : null,
    }));

    await supabase.from('order_items').insert(itemsRows);
  }

  console.log('\nSummary:');
  console.log(`  Total: ${orderList.length}`);
  console.log(`  Upserted: ${upserted}`);
  console.log(`  Failed: ${failed}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
