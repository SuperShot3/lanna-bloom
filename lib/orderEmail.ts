/**
 * Send order notification email via Resend.
 * Requires: RESEND_API_KEY, ORDERS_NOTIFY_EMAIL, ORDERS_FROM_EMAIL (e.g. "Lanna Bloom Orders <orders@lannabloom.shop>").
 * Optional: ORDERS_NOTIFY_EMAIL_CC — comma-separated extra recipients (e.g. partner inbox).
 * You can also list multiple addresses in ORDERS_NOTIFY_EMAIL separated by commas.
 * If any required value is missing, no email is sent.
 */

import { Resend } from 'resend';
import { getBaseUrl, getOrderDetailsUrl, type Order } from '@/lib/orders';
import { formatShopDateTime } from '@/lib/shopTime';
import { buildOrderTemplateVariables } from '@/lib/email/variablesFromOrder';

/** Primary + CC addresses for order admin emails, deduped. */
function getOrderNotifyRecipientList(): string[] {
  const primaryRaw = process.env.ORDERS_NOTIFY_EMAIL?.trim();
  const ccRaw = process.env.ORDERS_NOTIFY_EMAIL_CC?.trim();
  const parts: string[] = [];
  const pushSplit = (raw: string) => {
    for (const p of raw.split(',')) {
      const e = p.trim();
      if (e) parts.push(e);
    }
  };
  if (primaryRaw) pushSplit(primaryRaw);
  if (ccRaw) pushSplit(ccRaw);
  return Array.from(new Set(parts));
}

function getEnv(): {
  apiKey: string;
  to: string[];
  from: string;
} | null {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const to = getOrderNotifyRecipientList();
  const from = process.env.ORDERS_FROM_EMAIL?.trim();
  if (!apiKey || to.length === 0 || !from) return null;
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

  const customerOrderUrl = getOrderDetailsUrl(orderId);
  const adminOrderUrl = `${getBaseUrl()}/admin/orders/${encodeURIComponent(orderId)}`;
  const subject = `New order placed — ${orderId}`;
  const body = `A new order was created. Order ID: ${orderId}`;
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>${subject}</title></head>
<body style="font-family: sans-serif; line-height: 1.5; color: #333;">
  <p>${body}</p>
  <p><a href="${escapeHtml(adminOrderUrl)}" style="color: #967a4d; font-weight: 600;">Admin dashboard order page</a></p>
  <p><a href="${escapeHtml(customerOrderUrl)}" style="color: #967a4d; font-weight: 600;">Customer order page</a></p>
</body>
</html>
`.trim();
  const text = `${body}\n\nCustomer order page: ${customerOrderUrl}\nAdmin dashboard order page: ${adminOrderUrl}`;

  const resend = new Resend(env.apiKey);
  const { error } = await resend.emails.send({
    from: env.from,
    to: env.to,
    subject,
    html,
    text,
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
      if (i.addOns?.balloonText) line += ` — Balloon text: ${escapeHtml(i.addOns.balloonText)}`;
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
  Phone: ${order.delivery.recipientPhone ? escapeHtml(order.delivery.recipientPhone) : '—'}<br/>
  Surprise delivery: ${
    order.delivery.surpriseDelivery === true
      ? 'Yes'
      : order.delivery.surpriseDelivery === false
        ? 'No'
        : '—'
  }</p>
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
    to: env.to,
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
      if (i.addOns?.balloonText) line += ` — Balloon text: ${escapeHtml(i.addOns.balloonText)}`;
      return line;
    })
    .join('<br/>');

  const discountLine =
    order.referralDiscount != null && order.referralDiscount > 0
      ? `<br/>Discount: -฿${order.referralDiscount.toLocaleString()}`
      : '';
  const vars = buildOrderTemplateVariables(order);
  const greeting = escapeHtml(vars.customer_name || 'there');
  const safeOrderId = escapeHtml(vars.order_id);
  const safeDetailsUrl = escapeHtml(detailsUrl);
  const safeDeliveryDate = escapeHtml(order.delivery.preferredTimeSlot || '—');
  const safeDeliveryAddress = escapeHtml(order.delivery.address);

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width" /><title>Order confirmation ${safeOrderId}</title></head>
<body style="font-family: Georgia, 'Times New Roman', serif; line-height: 1.6; color: #2c2415; max-width: 560px; margin: 0 auto; padding: 16px; background: #fdfcf8;">
  ${vars.brand_header}
  <div style="background: #ffffff; border: 1px solid #eadfcd; border-radius: 14px; padding: 24px;">
    <p style="font-size: 18px; margin: 0 0 12px 0;">Hi ${greeting},</p>
    <h1 style="font-size: 24px; line-height: 1.3; margin: 0 0 14px 0; color: #2c2415;">Thank you for your order</h1>
    <p style="margin: 0 0 16px 0;">
      Your order <strong>${safeOrderId}</strong> has been received. We will prepare your flowers with care and keep your order details available online.
    </p>

    <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 20px 0 12px 0; width: 100%;">
      <tr>
        <td style="border-radius: 8px; background: #967a4d; text-align: center;">
          <a href="${safeDetailsUrl}" target="_blank" rel="noopener noreferrer" style="display: block; padding: 13px 22px; color: #fff; text-decoration: none; font-weight: 600; font-size: 15px;">View your order details</a>
        </td>
      </tr>
    </table>

    <div style="background: #faf7ef; border: 1px solid #eadfcd; border-radius: 10px; padding: 14px 16px; margin: 20px 0;">
      <h2 style="font-size: 16px; margin: 0 0 8px 0; color: #2c2415;">Delivery</h2>
      <p style="margin: 0 0 6px 0;"><strong>Date &amp; time:</strong> ${safeDeliveryDate}</p>
      <p style="margin: 0;"><strong>Address:</strong> ${safeDeliveryAddress}</p>
      ${order.delivery.deliveryGoogleMapsUrl ? `<p style="margin: 10px 0 0 0;"><a href="${escapeHtml(order.delivery.deliveryGoogleMapsUrl)}" target="_blank" rel="noopener noreferrer" style="color: #967a4d; font-weight: 600; text-decoration: none;">Open in Google Maps</a></p>` : ''}
    </div>

    <div style="background: #faf7ef; border: 1px solid #eadfcd; border-radius: 10px; padding: 14px 16px; margin: 20px 0;">
      <h2 style="font-size: 16px; margin: 0 0 8px 0; color: #2c2415;">Order summary</h2>
      <p style="margin: 0 0 12px 0;">${itemsList}</p>
      <p style="margin: 0;">Bouquet: ฿${order.pricing.itemsTotal.toLocaleString()}<br/>
      Delivery fee: ฿${order.pricing.deliveryFee.toLocaleString()}${discountLine}<br/>
      <strong>Total: ฿${order.pricing.grandTotal.toLocaleString()}</strong></p>
    </div>

    <p style="font-size: 15px; margin: 20px 0 0 0;">If you have any questions, please reply to this email or contact us via LINE, WhatsApp, or the contact details on our website.</p>
    <p style="font-size: 15px; margin: 12px 0 0 0;">Thank you for choosing Lanna Bloom and supporting local florists in Chiang Mai.</p>
  </div>

  <div style="margin-top: 24px;">
    ${vars.social_footer}
  </div>
</body>
</html>
`.trim();
  const text = `Hi ${vars.customer_name || 'there'},

Thank you for your order. Your order ${vars.order_id} has been received.

View your order details: ${detailsUrl}

Delivery
Date & time: ${order.delivery.preferredTimeSlot || '—'}
Address: ${order.delivery.address}

Items
${order.items.map((i) => `${i.bouquetTitle} — ${i.size} — ฿${i.price.toLocaleString()}`).join('\n')}

Price summary
Bouquet: ฿${order.pricing.itemsTotal.toLocaleString()}
Delivery fee: ฿${order.pricing.deliveryFee.toLocaleString()}${
  order.referralDiscount != null && order.referralDiscount > 0
    ? `\nDiscount: -฿${order.referralDiscount.toLocaleString()}`
    : ''
}
Total: ฿${order.pricing.grandTotal.toLocaleString()}

If you have any questions, please reply to this email or contact us via LINE, WhatsApp, or the contact details on our website.

Thank you for choosing Lanna Bloom and supporting local florists in Chiang Mai.`;

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from,
    to: [customerEmail],
    subject: `Order confirmation ${order.orderId} — Lanna Bloom`,
    html,
    text,
  });
  if (error) {
    console.error('[orderEmail] Customer confirmation Resend error:', error);
  }
}

/**
 * Send a payment-failed email to the customer with retry guidance (different card / PromptPay)
 * and a link back to the order page where they can re-initiate Stripe Checkout.
 *
 * Fired from the Stripe webhook for `checkout.session.async_payment_failed`
 * (e.g. PromptPay didn't settle) and `checkout.session.expired` (customer abandoned
 * after card decline / 3DS failure on Stripe's hosted page). No-op if no customerEmail
 * or env vars are not set. Bilingual: picks `th` or `en` from the lang argument; defaults to en.
 *
 * Returns true if Resend accepted the message (or no-op skip), false on Resend error.
 * Caller is responsible for idempotency — see `sendPaymentFailedNotificationsOnce`.
 */
export async function sendCustomerPaymentFailedEmail(
  order: Order,
  retryUrl: string,
  lang: 'en' | 'th' = 'en'
): Promise<boolean> {
  const customerEmail = order.customerEmail?.trim();
  if (!customerEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) return true;

  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.ORDERS_FROM_EMAIL?.trim();
  if (!apiKey || !from) return true;

  const grandTotal = order.pricing?.grandTotal ?? order.amountTotal ?? 0;
  const amountLabel = `฿${grandTotal.toLocaleString()}`;
  const safeRetryUrl = escapeHtml(retryUrl);
  const safeOrderId = escapeHtml(order.orderId);
  const greetName = order.customerName?.trim() ? escapeHtml(order.customerName.trim()) : null;

  const isTh = lang === 'th';
  const subject = isTh
    ? `การชำระเงินสำหรับคำสั่งซื้อ ${order.orderId} ยังไม่สำเร็จ — Lanna Bloom`
    : `Payment didn't complete for order ${order.orderId} — Lanna Bloom`;

  const html = isTh
    ? `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>${escapeHtml(subject)}</title></head>
<body style="font-family: sans-serif; line-height: 1.6; color: #333; max-width: 560px;">
  <h1 style="font-size: 1.2rem; margin-bottom: 0.5rem;">การชำระเงินยังไม่สำเร็จ</h1>
  <p>สวัสดี${greetName ? ` คุณ${greetName}` : ''} ค่ะ</p>
  <p>เราพยายามเก็บเงินสำหรับคำสั่งซื้อ <strong>${safeOrderId}</strong> จำนวน <strong>${amountLabel}</strong> แต่การชำระเงินยังไม่สำเร็จ</p>
  <p><strong>สาเหตุที่อาจเกิดขึ้น:</strong> ธนาคารผู้ออกบัตรของคุณอาจไม่อนุญาตให้ทำธุรกรรมข้ามประเทศมายังร้านค้าในประเทศไทย หรือบัตรประเภทนั้นอาจไม่รองรับการชำระเงินข้ามประเทศ</p>

  <h2 style="font-size: 1rem; margin-top: 1.25rem; margin-bottom: 0.5rem;">วิธีชำระเงินให้สำเร็จ</h2>
  <ul style="padding-left: 1.2rem;">
    <li><strong>ใช้บัตรอื่น</strong> — ลองใช้บัตรเครดิตหรือเดบิตใบอื่น</li>
    <li><strong>ใช้พร้อมเพย์ (PromptPay)</strong> — สแกน QR ผ่านแอปธนาคารไทย ชำระได้ทันที (สำหรับสกุลเงิน THB)</li>
  </ul>

  <p style="margin-top: 1.25rem;">
    <a href="${safeRetryUrl}" style="display: inline-block; background: #967a4d; color: #fff; padding: 10px 18px; border-radius: 6px; text-decoration: none; font-weight: 600;">ชำระเงินอีกครั้ง</a>
  </p>
  <p style="font-size: 0.85rem; color: #666; word-break: break-all;">${safeRetryUrl}</p>

  <p style="margin-top: 1.25rem;">หากต้องการความช่วยเหลือหรือต้องการชำระผ่านการโอนเงินผ่านธนาคาร กรุณาตอบกลับอีเมลนี้ หรือติดต่อเราทาง LINE / WhatsApp ค่ะ</p>

  <p style="font-size: 0.9rem; color: #666; margin-top: 1.5rem;">— Lanna Bloom</p>
</body>
</html>
`.trim()
    : `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>${escapeHtml(subject)}</title></head>
<body style="font-family: sans-serif; line-height: 1.6; color: #333; max-width: 560px;">
  <h1 style="font-size: 1.2rem; margin-bottom: 0.5rem;">Your payment didn't complete</h1>
  <p>Hi ${greetName ?? 'there'},</p>
  <p>We attempted to process your payment of <strong>${amountLabel}</strong> for order <strong>${safeOrderId}</strong>, but it didn't go through.</p>
  <p><strong>Why this happened:</strong> Your card issuer may have restrictions on international payments, or that card type may not be supported for cross-border transactions to Thai merchants.</p>

  <h2 style="font-size: 1rem; margin-top: 1.25rem; margin-bottom: 0.5rem;">How to complete your payment</h2>
  <ul style="padding-left: 1.2rem;">
    <li><strong>Use a different card</strong> — try another credit or debit card.</li>
    <li><strong>Pay with PromptPay</strong> — scan the QR with any Thai banking app, pay instantly (THB only).</li>
  </ul>

  <p style="margin-top: 1.25rem;">
    <a href="${safeRetryUrl}" style="display: inline-block; background: #967a4d; color: #fff; padding: 10px 18px; border-radius: 6px; text-decoration: none; font-weight: 600;">Retry payment</a>
  </p>
  <p style="font-size: 0.85rem; color: #666; word-break: break-all;">${safeRetryUrl}</p>

  <p style="margin-top: 1.25rem;">If you'd like to use bank transfer or need any assistance, just reply to this email or contact us via LINE / WhatsApp.</p>

  <p style="font-size: 0.9rem; color: #666; margin-top: 1.5rem;">— Lanna Bloom</p>
</body>
</html>
`.trim();

  const text = isTh
    ? `การชำระเงินสำหรับคำสั่งซื้อ ${order.orderId} (${amountLabel}) ยังไม่สำเร็จ\n\nวิธีชำระเงินให้สำเร็จ:\n• ใช้บัตรอื่น\n• ใช้พร้อมเพย์ผ่านแอปธนาคารไทย (THB เท่านั้น)\n\nชำระเงินอีกครั้ง: ${retryUrl}\n\nหากต้องการความช่วยเหลือ กรุณาตอบกลับอีเมลนี้ หรือติดต่อทาง LINE / WhatsApp\n— Lanna Bloom`
    : `Your payment of ${amountLabel} for order ${order.orderId} didn't complete.\n\nHow to complete your payment:\n• Use a different card\n• Pay with PromptPay via any Thai banking app (THB only)\n\nRetry payment: ${retryUrl}\n\nReply to this email or contact us via LINE / WhatsApp if you need help.\n— Lanna Bloom`;

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from,
    to: [customerEmail],
    subject,
    html,
    text,
  });
  if (error) {
    console.error('[orderEmail] Customer payment-failed Resend error:', error);
    return false;
  }
  return true;
}

/**
 * Minimal admin notification when a Stripe payment fails or the checkout session expires unpaid.
 * No-op if env vars not set. Sent at most once per order via the same idempotency claim
 * as the customer email.
 */
export async function sendAdminPaymentFailedEmail(
  orderId: string,
  reason: 'async_payment_failed' | 'session_expired',
  customerEmail?: string | null
): Promise<boolean> {
  const env = getEnv();
  if (!env) return true;

  const orderUrl = getOrderDetailsUrl(orderId);
  const reasonLabel =
    reason === 'async_payment_failed' ? 'async payment failed (e.g. PromptPay)' : 'checkout session expired (likely card decline / abandonment)';
  const subject = `Payment failed — order ${orderId}`;
  const customerLine = customerEmail?.trim()
    ? `<p>Customer email: <a href="mailto:${escapeHtml(customerEmail.trim())}">${escapeHtml(customerEmail.trim())}</a></p>`
    : '<p style="color: #888;">No customer email on file (no follow-up email sent to customer).</p>';

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>${escapeHtml(subject)}</title></head>
<body style="font-family: sans-serif; line-height: 1.5; color: #333;">
  <p><strong>Stripe payment failed</strong> for order <strong>${escapeHtml(orderId)}</strong>.</p>
  <p>Reason: ${escapeHtml(reasonLabel)}</p>
  ${customerLine}
  <p><a href="${escapeHtml(orderUrl)}" style="color: #967a4d; font-weight: 600;">View order</a></p>
  <p style="font-size: 0.85rem; color: #666; word-break: break-all;">${escapeHtml(orderUrl)}</p>
</body>
</html>
`.trim();
  const text = `Stripe payment failed for order ${orderId} (${reasonLabel}).\nCustomer email: ${customerEmail?.trim() || 'none'}\nView: ${orderUrl}`;

  const resend = new Resend(env.apiKey);
  const { error } = await resend.emails.send({
    from: env.from,
    to: env.to,
    subject,
    html,
    text,
  });
  if (error) {
    console.error('[orderEmail] Admin payment-failed Resend error:', error);
    return false;
  }
  return true;
}

/**
 * Post-delivery email: delivered confirmation + review ask.
 * Same env as customer confirmation (RESEND_API_KEY, ORDERS_FROM_EMAIL).
 * Returns true if sent or skipped as no-op (invalid email); false if Resend failed.
 */
export async function sendOrderDeliveredCustomerEmail(order: Order): Promise<boolean> {
  const customerEmail = order.customerEmail?.trim();
  if (!customerEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
    return false;
  }

  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.ORDERS_FROM_EMAIL?.trim();
  if (!apiKey || !from) {
    return false;
  }

  const vars = buildOrderTemplateVariables(order);
  const greeting = escapeHtml(vars.customer_name || 'there');
  const safeOrderId = escapeHtml(vars.order_id);
  const safeProductName = escapeHtml(vars.product_name);
  const safeDeliveryDate = escapeHtml(vars.delivery_date);
  const safeTotalPrice = escapeHtml(vars.total_price);
  const safeImportantDatesLink = escapeHtml(vars.important_dates_link);
  const safeReviewLink = escapeHtml(vars.review_link);

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width" /><title>Your flowers have been delivered</title></head>
<body style="font-family: Georgia, 'Times New Roman', serif; line-height: 1.6; color: #2c2415; max-width: 560px; margin: 0 auto; padding: 16px; background: #fdfcf8;">
  ${vars.brand_header}
  <div style="background: #ffffff; border: 1px solid #eadfcd; border-radius: 14px; padding: 24px;">
    <p style="font-size: 18px; margin: 0 0 12px 0;">Hi ${greeting},</p>
    <h1 style="font-size: 24px; line-height: 1.3; margin: 0 0 14px 0; color: #2c2415;">Your flowers have been delivered</h1>
    <p style="margin: 0 0 16px 0;">
      Your order <strong>${safeOrderId}</strong> has been delivered. We hope the flowers arrived beautifully and made someone's day a little more special.
    </p>

    <div style="background: #faf7ef; border: 1px solid #eadfcd; border-radius: 10px; padding: 14px 16px; margin: 20px 0;">
      <h2 style="font-size: 16px; margin: 0 0 8px 0; color: #2c2415;">Order summary</h2>
      <p style="margin: 0 0 6px 0;"><strong>Item:</strong> ${safeProductName}</p>
      <p style="margin: 0 0 6px 0;"><strong>Delivery date:</strong> ${safeDeliveryDate}</p>
      <p style="margin: 0;"><strong>Total:</strong> ${safeTotalPrice}</p>
    </div>

    <h2 style="font-size: 19px; line-height: 1.35; margin: 24px 0 10px 0; color: #2c2415;">A new reminder feature for future special days</h2>
    <p style="margin: 0 0 12px 0;">
      You can now save birthdays, anniversaries, Valentine's Day, Mother's Day, or any important date once, and Lanna Bloom will remind you by email before the day arrives.
    </p>
    <p style="margin: 0 0 18px 0;">
      The reminder can also include bouquet suggestions, so next time you do not need to remember the date or search from the beginning.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 20px 0 12px 0; width: 100%;">
      <tr>
        <td style="border-radius: 8px; background: #967a4d; text-align: center;">
          <a href="${safeImportantDatesLink}" target="_blank" rel="noopener noreferrer" style="display: block; padding: 13px 22px; color: #fff; text-decoration: none; font-weight: 600; font-size: 15px;">Save important dates</a>
        </td>
      </tr>
    </table>
    <p style="font-size: 13px; color: #6f624c; margin: 0 0 24px 0; text-align: center;">It takes less than 1 minute. You can unsubscribe anytime.</p>

    <div style="border-top: 1px solid #eadfcd; margin: 24px 0; padding-top: 20px;">
      <h2 style="font-size: 18px; line-height: 1.35; margin: 0 0 10px 0; color: #2c2415;">Did everything go well?</h2>
      <p style="margin: 0 0 16px 0;">If you were happy with your order, your review would really help our small local flower business in Chiang Mai.</p>
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 0 20px 0; width: 100%;">
        <tr>
          <td style="border-radius: 8px; background: #ffffff; border: 1px solid #d4c4a8; text-align: center;">
            <a href="${safeReviewLink}" target="_blank" rel="noopener noreferrer" style="display: block; padding: 13px 22px; color: #967a4d; text-decoration: none; font-weight: 600; font-size: 15px;">Leave a review</a>
          </td>
        </tr>
      </table>
    </div>

    <p style="font-size: 15px; margin: 0;">Thank you for choosing Lanna Bloom and supporting local florists in Chiang Mai.</p>
  </div>

  <div style="margin-top: 24px;">
    ${vars.social_footer}
  </div>
</body>
</html>
`.trim();
  const text = `Hi ${vars.customer_name || 'there'},

Your order ${vars.order_id} has been delivered. We hope the flowers arrived beautifully and made someone's day a little more special.

Order summary
Item: ${vars.product_name}
Delivery date: ${vars.delivery_date}
Total: ${vars.total_price}

A new reminder feature for future special days
You can now save birthdays, anniversaries, Valentine's Day, Mother's Day, or any important date once, and Lanna Bloom will remind you by email before the day arrives.

The reminder can also include bouquet suggestions, so next time you do not need to remember the date or search from the beginning.

Save important dates: ${vars.important_dates_link}

Did everything go well?
If you were happy with your order, your review would really help our small local flower business in Chiang Mai.

Leave a review: ${vars.review_link}

Thank you for choosing Lanna Bloom and supporting local florists in Chiang Mai.`;

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from,
    to: [customerEmail],
    subject: 'Your flowers have been delivered',
    html,
    text,
  });
  if (error) {
    console.error('[orderEmail] Delivered confirmation Resend error:', error);
    return false;
  }
  return true;
}

/** Newsletter notification env. Uses NEWSLETTER_NOTIFY_EMAIL or the first address in ORDERS_NOTIFY_EMAIL. */
function getNewsletterEnv(): { apiKey: string; to: string; from: string } | null {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const explicit = process.env.NEWSLETTER_NOTIFY_EMAIL?.trim();
  const primaryFirst = process.env.ORDERS_NOTIFY_EMAIL?.split(',')[0]?.trim();
  const to = explicit || primaryFirst;
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
