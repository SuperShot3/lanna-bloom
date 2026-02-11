/**
 * Send order notification email via Resend.
 * Requires: RESEND_API_KEY, ORDERS_NOTIFY_EMAIL, ORDERS_FROM_EMAIL (e.g. "Lanna Bloom Orders <orders@lannabloom.shop>").
 * If any is missing, no email is sent.
 */

import { Resend } from 'resend';
import type { Order } from '@/lib/orders';

function getEnv(): {
  apiKey: string;
  to: string;
  from: string;
} | null {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const to = process.env.ORDERS_NOTIFY_EMAIL?.trim();
  const from = process.env.ORDERS_FROM_EMAIL?.trim();
  if (!apiKey || !to || !from) return null;
  return { apiKey, to, from };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Send order notification to ORDERS_NOTIFY_EMAIL. No-op if env vars are not set. */
export async function sendOrderNotificationEmail(order: Order, detailsUrl: string): Promise<void> {
  const env = getEnv();
  if (!env) return;

  const itemsList = order.items
    .map(
      (i) =>
        `• ${escapeHtml(i.bouquetTitle)} — ${escapeHtml(i.size)} — ฿${i.price.toLocaleString()}`
    )
    .join('<br/>');
  const contactPref = order.contactPreference?.length
    ? order.contactPreference.join(', ')
    : '—';

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Order ${escapeHtml(order.orderId)}</title></head>
<body style="font-family: sans-serif; line-height: 1.5; color: #333;">
  <h1 style="font-size: 1.25rem;">New order: ${escapeHtml(order.orderId)}</h1>
  <p><a href="${escapeHtml(detailsUrl)}">View order details</a></p>
  <h2 style="font-size: 1rem;">Customer</h2>
  <p>${order.customerName ? escapeHtml(order.customerName) : '—'}<br/>
  Phone: ${order.phone ? escapeHtml(order.phone) : '—'}<br/>
  Preferred contact: ${escapeHtml(contactPref)}</p>
  <h2 style="font-size: 1rem;">Delivery</h2>
  <p>${escapeHtml(order.delivery.address)}<br/>
  Time: ${escapeHtml(order.delivery.preferredTimeSlot)}</p>
  ${order.delivery.deliveryGoogleMapsUrl ? `<p><a href="${escapeHtml(order.delivery.deliveryGoogleMapsUrl)}">Open in Google Maps</a></p>` : ''}
  <h2 style="font-size: 1rem;">Items</h2>
  <p>${itemsList}</p>
  <p><strong>Items total: ฿${order.pricing.itemsTotal.toLocaleString()} + delivery</strong></p>
  <p style="font-size: 0.9rem; color: #666;">Created: ${new Date(order.createdAt).toISOString()}</p>
</body>
</html>
`.trim();

  const resend = new Resend(env.apiKey);
  const { error } = await resend.emails.send({
    from: env.from,
    to: [env.to],
    subject: `Order ${order.orderId} — Lanna Bloom`,
    html,
  });
  if (error) {
    console.error('[orderEmail] Resend error:', error);
  }
}
