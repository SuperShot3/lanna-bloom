/**
 * Order-level gift card messages (1–3 free cards per order).
 * Prefer `order.giftCardMessages`; fall back to legacy per-item cardMessage (deduped).
 */

import {
  CHECKOUT_FIELD_LIMITS,
  GIFT_CARD_MESSAGES_MAX_COUNT,
  clipCheckoutField,
} from '@/lib/checkout/checkoutFieldLimits';

export { GIFT_CARD_MESSAGES_MAX_COUNT };

export function clipGiftCardMessage(message: string): string {
  return clipCheckoutField(message, 'giftCardMessage');
}

/** Clip and cap for API / order_json persistence (empty strings dropped). */
export function normalizeGiftCardMessagesForPersist(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const entry of raw) {
    if (typeof entry !== 'string') continue;
    const clipped = clipGiftCardMessage(entry.trim());
    if (!clipped) continue;
    out.push(clipped);
    if (out.length >= GIFT_CARD_MESSAGES_MAX_COUNT) break;
  }
  return out;
}

/**
 * UI slots: always at least one field; preserve empty drafts; max GIFT_CARD_MESSAGES_MAX_COUNT.
 * Migrates a legacy single string draft when needed.
 */
export function normalizeGiftCardMessagesForUi(raw: unknown): string[] {
  if (typeof raw === 'string') {
    return [clipGiftCardMessage(raw)];
  }
  if (!Array.isArray(raw) || raw.length === 0) {
    return [''];
  }
  const slots = raw
    .filter((e): e is string => typeof e === 'string')
    .map((e) => clipGiftCardMessage(e))
    .slice(0, GIFT_CARD_MESSAGES_MAX_COUNT);
  return slots.length > 0 ? slots : [''];
}

export type GiftCardMessagesSource = {
  giftCardMessages?: string[] | null;
  items?: Array<{ addOns?: { cardMessage?: string | null } | null }> | null;
  customOrderDetails?: { greetingCard?: string | null } | null;
};

/**
 * Canonical read helper for admin, email, customer view, supplier.
 * 1) order.giftCardMessages (non-empty)
 * 2) unique trimmed items[].addOns.cardMessage (legacy fan-out)
 * 3) customOrderDetails.greetingCard
 */
export function getOrderGiftCardMessages(order: GiftCardMessagesSource): string[] {
  const fromOrder = normalizeGiftCardMessagesForPersist(order.giftCardMessages ?? []);
  if (fromOrder.length > 0) return fromOrder;

  const seen = new Set<string>();
  const fromItems: string[] = [];
  for (const item of order.items ?? []) {
    const msg = item.addOns?.cardMessage?.trim() ?? '';
    if (!msg || seen.has(msg)) continue;
    seen.add(msg);
    fromItems.push(clipGiftCardMessage(msg));
    if (fromItems.length >= GIFT_CARD_MESSAGES_MAX_COUNT) break;
  }
  if (fromItems.length > 0) return fromItems;

  const greeting = order.customOrderDetails?.greetingCard?.trim();
  if (greeting) return [clipGiftCardMessage(greeting)];

  return [];
}

export function giftCardMessageMaxLength(): number {
  return CHECKOUT_FIELD_LIMITS.giftCardMessage;
}
