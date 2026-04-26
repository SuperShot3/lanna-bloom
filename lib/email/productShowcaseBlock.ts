import 'server-only';
import { escapeHtml } from './escape';
import type { OrderItem } from '@/lib/orders/types';
import type { RecommendedBouquet } from './recommendBouquet';

const LANG = 'en';

function toAbsoluteImageUrl(base: string, u: string | undefined): string {
  const s = (u ?? '').trim();
  if (!s) return '';
  if (/^https?:\/\//i.test(s)) return s;
  if (s.startsWith('//')) return `https:${s}`;
  const b = base.replace(/\/$/, '');
  return s.startsWith('/') ? `${b}${s}` : `${b}/${s}`;
}

function e(s: string): string {
  return escapeHtml(s);
}

/**
 * Table-based, inline-styled “product card” for email clients (no carousel, no scroll).
 * Matches site feel: off-white card, #1A3C34 text, mint CTA, gold accent.
 */
function cardShell(inner: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:400px; margin:16px auto;">
  <tr>
    <td style="background:#FDFCF8; border:1px solid #e8e0d4; border-radius:10px; padding:16px; font-family:Georgia,'Times New Roman',serif; color:#1A3C34;">
${inner}
    </td>
  </tr>
</table>`;
}

function buttonRow(
  href: string,
  label: string,
  style: 'mint' | 'gold' | 'outline'
): string {
  const h = e(href);
  const l = e(label);
  if (style === 'gold') {
    return `      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 8px 0;">
        <tr>
          <td style="border-radius:6px; background:#967a4d; text-align:center;">
            <a href="${h}" style="display:block; padding:12px 16px; color:#fff; text-decoration:none; font-weight:600; font-size:15px; letter-spacing:0.02em;">${l}</a>
          </td>
        </tr>
      </table>`;
  }
  if (style === 'mint') {
    return `      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 8px 0;">
        <tr>
          <td style="border-radius:6px; background:#E8F4EC; border:1px solid rgba(26,60,52,0.2); text-align:center;">
            <a href="${h}" style="display:block; padding:12px 16px; color:#1A3C34; text-decoration:none; font-weight:600; font-size:14px; text-transform:uppercase; letter-spacing:0.04em;">${l}</a>
          </td>
        </tr>
      </table>`;
  }
  return `      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 8px 0;">
        <tr>
          <td style="border-radius:6px; background:#fff; border:1px solid #d4c4a8; text-align:center;">
            <a href="${h}" style="display:block; padding:12px 16px; color:#1A3C34; text-decoration:none; font-weight:600; font-size:14px;">${l}</a>
          </td>
        </tr>
      </table>`;
}

/**
 * “Buy in one click” on the site adds and opens checkout; in email we send users to the product page
 * to pick size and add — same destination as the primary CTA, second row stresses speed.
 */
export function buildOrderLineProductShowcase(
  base: string,
  first: OrderItem | undefined
): string {
  const title = (first?.bouquetTitle ?? '').trim();
  if (!title) return '';

  const b = base.replace(/\/$/, '');
  const slug = (first?.bouquetSlug ?? '').trim();
  const pdp = slug
    ? `${b}/${LANG}/catalog/${encodeURIComponent(slug)}?src=order_email`
    : `${b}/${LANG}/catalog?src=order_email`;
  const cart = `${b}/${LANG}/cart?src=order_email`;
  const img = toAbsoluteImageUrl(b, first?.imageUrl);
  const size = (first?.size ?? '').trim();
  const price =
    first?.price != null && !Number.isNaN(first.price)
      ? `฿${first.price.toLocaleString()}`
      : '';

  const imageBlock = img
    ? `      <p style="text-align:center; margin:0 0 12px 0;">
        <a href="${e(pdp)}" style="text-decoration:none;">
          <img src="${e(img)}" alt="${e(title)}" width="280" style="display:block; width:100%; max-width:280px; height:auto; margin:0 auto; border-radius:8px; border:1px solid #e8e0d4;" />
        </a>
      </p>
`
    : '';

  const meta: string[] = [];
  if (size) meta.push(e(size));
  if (price) meta.push(e(price));
  const metaLine = meta.length
    ? `      <p style="margin:0 0 16px 0; font-size:15px; color:#5a5248; line-height:1.4;">${meta.join(' · ')}</p>
`
    : '      <p style="margin:0 0 16px 0; font-size:1px; line-height:0;">&nbsp;</p>\n';

  const inner = `      <p style="margin:0 0 4px 0; font-size:12px; text-transform:uppercase; letter-spacing:0.08em; color:#967a4d;">Your bouquet</p>
      <p style="margin:0 0 8px 0; font-size:18px; font-weight:600; color:#1A3C34; line-height:1.3;">${e(title)}</p>
${metaLine}${imageBlock}
${buttonRow(pdp, 'Add to cart', 'mint')}
${buttonRow(cart, 'Buy in one click', 'outline')}
      <p style="margin:8px 0 0 0; font-size:13px; text-align:center;">
        <a href="${e(pdp)}" style="color:#967a4d; text-decoration:underline;">Add to favorites on the site</a>
      </p>
      <p style="margin:10px 0 0 0; font-size:12px; text-align:center; color:#7a6f62;">
        <a href="${e(cart)}" style="color:#5a5248; text-decoration:underline;">View shopping cart</a>
      </p>
`;

  return cardShell(inner);
}

export function buildReminderProductShowcase(
  base: string,
  product: RecommendedBouquet
): string {
  const name = (product.name ?? '').trim();
  if (!name) return '';

  const b = base.replace(/\/$/, '');
  const img = toAbsoluteImageUrl(b, product.image);
  const pdp = (product.confirmUrl ?? '').trim() || `${b}/${LANG}/catalog?src=reminder`;
  const other = (product.chooseAnotherUrl ?? '').trim() || `${b}/${LANG}/catalog`;
  const cart = `${b}/${LANG}/cart?src=reminder`;
  const price = (product.priceLabel ?? '').trim();

  const imageBlock = img
    ? `      <p style="text-align:center; margin:0 0 12px 0;">
        <a href="${e(pdp)}" style="text-decoration:none;">
          <img src="${e(img)}" alt="${e(name)}" width="280" style="display:block; width:100%; max-width:280px; height:auto; margin:0 auto; border-radius:8px; border:1px solid #e8e0d4;" />
        </a>
      </p>
`
    : '';

  const priceLine = price
    ? `      <p style="margin:0 0 14px 0; font-size:15px; color:#1A3C34;"><strong>${e(name)}</strong> — ${e(price)}</p>
`
    : `      <p style="margin:0 0 14px 0; font-size:16px; font-weight:600; color:#1A3C34;">${e(name)}</p>
`;

  const inner = `      <p style="margin:0 0 4px 0; font-size:12px; text-transform:uppercase; letter-spacing:0.08em; color:#967a4d;">Suggestion</p>
${imageBlock}${priceLine}
${buttonRow(pdp, 'Confirm this bouquet', 'gold')}
      <p style="margin:0 0 10px 0; font-size:14px; text-align:center;">
        <a href="${e(other)}" style="color:#967a4d; font-weight:600; text-decoration:underline;">Choose another bouquet</a>
      </p>
${buttonRow(pdp, 'Add to cart on the site', 'mint')}
      <p style="margin:0 0 0 0; font-size:13px; text-align:center;">
        <a href="${e(pdp)}" style="color:#967a4d; text-decoration:underline;">Add to favorites</a>
        <span style="color:#b8a99a;"> · </span>
        <a href="${e(cart)}" style="color:#5a5248; text-decoration:underline;">View cart</a>
      </p>
`;

  return cardShell(inner);
}

const MOCK_ORDER_ITEM: OrderItem = {
  bouquetId: 'demo',
  bouquetTitle: 'Sunrise bouquet',
  size: 'Standard',
  price: 2800,
  addOns: { cardType: null, cardMessage: '', wrappingOption: 'standard' },
  imageUrl: 'https://lannabloom.shop/favicon_io/android-chrome-192x192.png',
  bouquetSlug: '101-mixed-roses',
};

/**
 * Fills `product_showcase` for admin preview / test-send when not using a real order
 * (so template variables from MOCK still show a sample card when `{{product_showcase}}` is present).
 */
export function ensureProductShowcaseForPreview(
  templateKey: string,
  base: string,
  vars: Record<string, string>
): void {
  if ((vars.product_showcase ?? '').trim() !== '') return;
  if (templateKey.startsWith('reminder_')) {
    const b = base.replace(/\/$/, '');
    vars.product_showcase = buildReminderProductShowcase(b, {
      name: vars.recommended_product_name || 'Featured bouquet',
      image: vars.recommended_product_image || '',
      priceLabel: vars.recommended_product_price || '—',
      confirmUrl: vars.confirm_url || `${b}/en/catalog`,
      chooseAnotherUrl: vars.choose_another_url || `${b}/en/catalog`,
      bouquetId: 'demo',
    });
    return;
  }
  if (templateKey === 'order_delivered' || templateKey.startsWith('order_')) {
    vars.product_showcase = buildOrderLineProductShowcase(
      base.replace(/\/$/, ''),
      MOCK_ORDER_ITEM
    );
  }
}
