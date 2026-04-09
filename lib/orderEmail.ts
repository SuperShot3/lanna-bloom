/**
 * Send order notification email via Resend.
 * Requires: RESEND_API_KEY, ORDERS_NOTIFY_EMAIL, ORDERS_FROM_EMAIL (e.g. "Lanna Bloom Orders <orders@lannabloom.shop>").
 * If any is missing, no email is sent.
 */

import { Resend } from 'resend';
import type { Order } from '@/lib/orders';
import { formatShopDateTime } from '@/lib/shopTime';

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

/**
 * Send a minimal admin "new order" email (subject + single-line body).
 * Used once per order at placement only. No-op if env vars not set.
 */
export async function sendMinimalAdminNewOrderEmail(orderId: string): Promise<void> {
  const env = getEnv();
  if (!env) return;

  const subject = `New order placed — ${orderId}`;
  const body = `A new order was created. Order ID: ${orderId}`;
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>${subject}</title></head>
<body style="font-family: sans-serif; line-height: 1.5; color: #333;">
  <p>${body}</p>
</body>
</html>
`.trim();

  const resend = new Resend(env.apiKey);
  const { error } = await resend.emails.send({
    from: env.from,
    to: [env.to],
    subject,
    html,
  });
  if (error) {
    throw new Error(`Resend error: ${JSON.stringify(error)}`);
  }
}

/** Send order notification to ORDERS_NOTIFY_EMAIL. No-op if env vars are not set. */
export async function sendOrderNotificationEmail(order: Order, detailsUrl: string): Promise<void> {
  const env = getEnv();
  if (!env) return;

  const itemsList = order.items
    .map((i) => {
      let line = `• ${escapeHtml(i.bouquetTitle)} — ${escapeHtml(i.size)} — ฿${i.price.toLocaleString()}`;
      if (i.addOns?.wrappingOption) line += ` (Wrapping: ${escapeHtml(i.addOns.wrappingOption)})`;
      if (i.addOns?.cardMessage) line += ` — Card: ${escapeHtml(i.addOns.cardMessage)}`;
      return line;
    })
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

  <h2 style="font-size: 1rem;">Delivery</h2>
  <p>Date & time: ${escapeHtml(order.delivery.preferredTimeSlot || '—')}<br/>
  Address: ${escapeHtml(order.delivery.address)}</p>
  ${order.delivery.deliveryGoogleMapsUrl ? `<p><a href="${escapeHtml(order.delivery.deliveryGoogleMapsUrl)}">Open in Google Maps</a></p>` : ''}

  ${(order.delivery.recipientName || order.delivery.recipientPhone) ? `
  <h2 style="font-size: 1rem;">Recipient</h2>
  <p>${order.delivery.recipientName ? escapeHtml(order.delivery.recipientName) : '—'}<br/>
  Phone: ${order.delivery.recipientPhone ? escapeHtml(order.delivery.recipientPhone) : '—'}</p>
  ` : ''}

  <h2 style="font-size: 1rem;">Items</h2>
  <p>${itemsList}</p>

  <h2 style="font-size: 1rem;">Price summary</h2>
  <p>Bouquet: ฿${order.pricing.itemsTotal.toLocaleString()}<br/>
  Delivery fee: ฿${order.pricing.deliveryFee.toLocaleString()}<br/>
  ${order.referralDiscount != null && order.referralDiscount > 0 ? `Discount: -฿${order.referralDiscount.toLocaleString()}<br/>` : ''}
  <strong>Total: ฿${order.pricing.grandTotal.toLocaleString()}</strong></p>

  <h2 style="font-size: 1rem;">Sender</h2>
  <p>${order.customerName ? escapeHtml(order.customerName) : '—'}<br/>
  Phone: ${order.phone ? escapeHtml(order.phone) : '—'}<br/>
  Preferred contact: ${escapeHtml(contactPref)}</p>

  <p style="font-size: 0.9rem; color: #666;">Created: ${escapeHtml(formatShopDateTime(order.createdAt))}</p>
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

/** Send order confirmation to the customer when they provide an email. No-op if no customerEmail or env vars not set. */
export async function sendCustomerConfirmationEmail(order: Order, detailsUrl: string): Promise<void> {
  const customerEmail = order.customerEmail?.trim();
  if (!customerEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) return;

  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.ORDERS_FROM_EMAIL?.trim();
  if (!apiKey || !from) return;

  const itemsList = order.items
    .map((i) => {
      let line = `• ${escapeHtml(i.bouquetTitle)} — ${escapeHtml(i.size)} — ฿${i.price.toLocaleString()}`;
      if (i.addOns?.wrappingOption) line += ` (Wrapping: ${escapeHtml(i.addOns.wrappingOption)})`;
      if (i.addOns?.cardMessage) line += ` — Card: ${escapeHtml(i.addOns.cardMessage)}`;
      return line;
    })
    .join('<br/>');

  const discountLine =
    order.referralDiscount != null && order.referralDiscount > 0
      ? `<br/>Discount: -฿${order.referralDiscount.toLocaleString()}`
      : '';

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Order confirmation ${escapeHtml(order.orderId)}</title></head>
<body style="font-family: sans-serif; line-height: 1.5; color: #333;">
  <h1 style="font-size: 1.25rem;">Thank you for your order!</h1>
  <p>Hi ${order.customerName ? escapeHtml(order.customerName) : 'there'},</p>
  <p>Your order <strong>${escapeHtml(order.orderId)}</strong> has been received.</p>
  <p><a href="${escapeHtml(detailsUrl)}" style="color: #967a4d; font-weight: 600;">View your order details</a></p>

  <h2 style="font-size: 1rem;">Delivery</h2>
  <p>Date & time: ${escapeHtml(order.delivery.preferredTimeSlot || '—')}<br/>
  Address: ${escapeHtml(order.delivery.address)}</p>
  ${order.delivery.deliveryGoogleMapsUrl ? `<p><a href="${escapeHtml(order.delivery.deliveryGoogleMapsUrl)}">Open in Google Maps</a></p>` : ''}

  <h2 style="font-size: 1rem;">Items</h2>
  <p>${itemsList}</p>

  <h2 style="font-size: 1rem;">Price summary</h2>
  <p>Bouquet: ฿${order.pricing.itemsTotal.toLocaleString()}<br/>
  Delivery fee: ฿${order.pricing.deliveryFee.toLocaleString()}${discountLine}<br/>
  <strong>Total: ฿${order.pricing.grandTotal.toLocaleString()}</strong></p>

  <p style="font-size: 0.9rem; color: #666;">If you have any questions, please contact us via LINE, WhatsApp, or the contact details on our website.</p>
  <p style="font-size: 0.9rem; color: #666;">— Lanna Bloom</p>
</body>
</html>
`.trim();

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from,
    to: [customerEmail],
    subject: `Order confirmation ${order.orderId} — Lanna Bloom`,
    html,
  });
  if (error) {
    console.error('[orderEmail] Customer confirmation Resend error:', error);
  }
}

/** Newsletter notification env. Uses NEWSLETTER_NOTIFY_EMAIL or falls back to ORDERS_NOTIFY_EMAIL. */
function getNewsletterEnv(): { apiKey: string; to: string; from: string } | null {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const to =
    process.env.NEWSLETTER_NOTIFY_EMAIL?.trim() ||
    process.env.ORDERS_NOTIFY_EMAIL?.trim();
  const from = process.env.ORDERS_FROM_EMAIL?.trim();
  if (!apiKey || !to || !from) return null;
  return { apiKey, to, from };
}

/** Send newsletter signup notification to business email. No-op if env vars not set. */
export async function sendNewsletterNotificationEmail(
  email: string,
  source: string,
  createdAt: Date
): Promise<void> {
  const env = getNewsletterEnv();
  if (!env) return;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>New newsletter subscriber</title></head>
<body style="font-family: sans-serif; line-height: 1.5; color: #333;">
  <h1 style="font-size: 1.25rem;">New newsletter subscriber</h1>
  <p><strong>Email:</strong> ${escapeHtml(email)}</p>
  <p><strong>Source:</strong> ${escapeHtml(source)}</p>
  <p><strong>Subscribed at:</strong> ${escapeHtml(createdAt.toISOString())}</p>
  <p style="font-size: 0.9rem; color: #666;">Lanna Bloom — newsletter signup</p>
</body>
</html>
`.trim();

  const resend = new Resend(env.apiKey);
  const { error } = await resend.emails.send({
    from: env.from,
    to: [env.to],
    subject: 'New newsletter subscriber',
    html,
  });
  if (error) {
    console.error('[orderEmail] Newsletter notification Resend error:', error);
  }
}
