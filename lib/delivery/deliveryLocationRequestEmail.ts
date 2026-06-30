/**
 * Admin email for delivery location check requests.
 */

import { Resend } from 'resend';
import type { ValidatedDeliveryLocationRequest } from '@/lib/delivery/deliveryLocationRequestValidate';

function getNotifyRecipients(): string[] {
  const dedicated = process.env.DELIVERY_REQUEST_NOTIFY_EMAIL?.trim();
  const ordersRaw = process.env.ORDERS_NOTIFY_EMAIL?.trim();
  const raw = dedicated || ordersRaw;
  if (!raw) return [];
  return Array.from(
    new Set(
      raw
        .split(',')
        .map((e) => e.trim())
        .filter(Boolean)
    )
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function sendDeliveryLocationRequestAdminEmail(params: {
  requestId: string;
  data: ValidatedDeliveryLocationRequest;
  sharedCartUrl: string | null;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.ORDERS_FROM_EMAIL?.trim();
  const to = getNotifyRecipients();
  if (!apiKey || !from || to.length === 0) return;

  const { requestId, data, sharedCartUrl } = params;
  const subject = `Delivery area check — ${data.customerName}`;
  const lines: string[] = [
    'A customer could not find their delivery area at checkout.',
    '',
    `Request ID: ${requestId}`,
    `Channel: ${data.submissionChannel}`,
    `Language: ${data.lang}`,
    '',
    `Name: ${data.customerName}`,
    `Reply to email: ${data.customerEmail}`,
  ];
  if (data.customerPhone) lines.push(`Phone (optional): ${data.customerPhone}`);
  if (data.locationText) lines.push('', `Location text: ${data.locationText}`);
  if (data.googleMapsUrl) lines.push('', `Google Maps: ${data.googleMapsUrl}`);
  if (sharedCartUrl) lines.push('', `Shared cart (3 days): ${sharedCartUrl}`);
  if (data.sourcePath) lines.push('', `Page: ${data.sourcePath}`);
  lines.push('', 'This is not a paid order — please reply to the customer by email.');

  const text = lines.join('\n');

  const htmlParts = [
    '<p>A customer could not find their delivery area at checkout.</p>',
    '<p><strong>Reply to:</strong> ',
    `<a href="mailto:${escapeHtml(data.customerEmail)}">${escapeHtml(data.customerEmail)}</a></p>`,
    '<ul>',
    `<li><strong>Request ID:</strong> ${escapeHtml(requestId)}</li>`,
    `<li><strong>Name:</strong> ${escapeHtml(data.customerName)}</li>`,
  ];
  if (data.customerPhone) {
    htmlParts.push(`<li><strong>Phone (optional):</strong> ${escapeHtml(data.customerPhone)}</li>`);
  }
  if (data.locationText) {
    htmlParts.push(`<li><strong>Location:</strong> ${escapeHtml(data.locationText)}</li>`);
  }
  if (data.googleMapsUrl) {
    const url = escapeHtml(data.googleMapsUrl);
    htmlParts.push(
      `<li><strong>Google Maps:</strong> <a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a></li>`
    );
  }
  if (sharedCartUrl) {
    const url = escapeHtml(sharedCartUrl);
    htmlParts.push(
      `<li><strong>Shared cart:</strong> <a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a></li>`
    );
  }
  htmlParts.push('</ul>');
  htmlParts.push(
    '<p style="color:#666;font-size:14px;">This is not a paid order — please reply to the customer by email.</p>'
  );

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from,
    to,
    subject,
    text,
    html: `<!DOCTYPE html><html><body style="font-family:sans-serif;line-height:1.5;color:#333;">${htmlParts.join('')}</body></html>`,
  });
  if (error) {
    console.error('[deliveryLocationRequestEmail] send failed', error);
  }
}
