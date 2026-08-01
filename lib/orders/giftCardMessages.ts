/**
 * Order-level gift card messages (1–3 free cards per order).
 * Prefer `order.giftCardMessages`; fall back to legacy per-item cardMessage (deduped).
 * Each entry may include `itemTitle` so ops know which flower the card belongs to.
 */

import {
  CHECKOUT_FIELD_LIMITS,
  GIFT_CARD_MESSAGES_MAX_COUNT,
  clipCheckoutField,
} from '@/lib/checkout/checkoutFieldLimits';

export { GIFT_CARD_MESSAGES_MAX_COUNT };

export type OrderGiftCardEntry = {
  text: string;
  /** Flower / product name this card is for (display + ops). */
  itemTitle?: string;
};

export function clipGiftCardMessage(message: string): string {
  return clipCheckoutField(message, 'giftCardMessage');
}

function parseEntry(raw: unknown): OrderGiftCardEntry | null {
  if (typeof raw === 'string') {
    const text = clipGiftCardMessage(raw.trim());
    return text ? { text } : null;
  }
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const textRaw = typeof o.text === 'string' ? o.text : typeof o.message === 'string' ? o.message : '';
  const text = clipGiftCardMessage(textRaw.trim());
  if (!text) return null;
  const itemTitle =
    typeof o.itemTitle === 'string' && o.itemTitle.trim()
      ? o.itemTitle.trim().slice(0, 120)
      : undefined;
  return itemTitle ? { text, itemTitle } : { text };
}

/** Clip and cap for API / order_json persistence (empty texts dropped). */
export function normalizeGiftCardMessagesForPersist(raw: unknown): OrderGiftCardEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: OrderGiftCardEntry[] = [];
  for (const entry of raw) {
    const parsed = parseEntry(entry);
    if (!parsed) continue;
    out.push(parsed);
    if (out.length >= GIFT_CARD_MESSAGES_MAX_COUNT) break;
  }
  return out;
}

/**
 * Attach cart item titles to message texts by index (expanded cart units).
 * Used when building the Stripe / order payload.
 */
export function pairGiftCardMessagesWithItemTitles(
  messages: string[],
  itemTitles: string[]
): OrderGiftCardEntry[] {
  const out: OrderGiftCardEntry[] = [];
  for (let i = 0; i < messages.length && out.length < GIFT_CARD_MESSAGES_MAX_COUNT; i++) {
    const text = clipGiftCardMessage((messages[i] ?? '').trim());
    if (!text) continue;
    const itemTitle = itemTitles[i]?.trim().slice(0, 120) || undefined;
    out.push(itemTitle ? { text, itemTitle } : { text });
  }
  return out;
}

/**
 * UI slots: always at least one field; preserve empty drafts; max GIFT_CARD_MESSAGES_MAX_COUNT.
 * Accepts legacy string, string[], or OrderGiftCardEntry[].
 */
export function normalizeGiftCardMessagesForUi(raw: unknown): string[] {
  if (typeof raw === 'string') {
    return [clipGiftCardMessage(raw)];
  }
  if (!Array.isArray(raw) || raw.length === 0) {
    return [''];
  }
  const slots: string[] = [];
  for (const entry of raw) {
    if (typeof entry === 'string') {
      slots.push(clipGiftCardMessage(entry));
    } else if (entry && typeof entry === 'object') {
      const o = entry as Record<string, unknown>;
      const text =
        typeof o.text === 'string'
          ? o.text
          : typeof o.message === 'string'
            ? o.message
            : '';
      slots.push(clipGiftCardMessage(text));
    }
    if (slots.length >= GIFT_CARD_MESSAGES_MAX_COUNT) break;
  }
  return slots.length > 0 ? slots : [''];
}

export type GiftCardMessagesSource = {
  giftCardMessages?: Array<string | OrderGiftCardEntry> | null;
  items?: Array<{
    bouquetTitle?: string | null;
    addOns?: { cardMessage?: string | null } | null;
  }> | null;
  customOrderDetails?: { greetingCard?: string | null } | null;
};

/** Display line: "Sunset Bouquet: Happy Birthday" or plain text. */
export function formatGiftCardEntry(entry: OrderGiftCardEntry): string {
  const text = entry.text.trim();
  const title = entry.itemTitle?.trim();
  if (title && text) return `${title}: ${text}`;
  return text;
}

/**
 * Canonical structured read helper for admin, email, customer view, supplier.
 * 1) order.giftCardMessages (non-empty)
 * 2) unique trimmed items[].addOns.cardMessage (legacy fan-out), with bouquetTitle
 * 3) customOrderDetails.greetingCard
 */
export function getOrderGiftCardEntries(order: GiftCardMessagesSource): OrderGiftCardEntry[] {
  const fromOrder = normalizeGiftCardMessagesForPersist(order.giftCardMessages ?? []);
  if (fromOrder.length > 0) return fromOrder;

  const seen = new Set<string>();
  const fromItems: OrderGiftCardEntry[] = [];
  for (const item of order.items ?? []) {
    const msg = item.addOns?.cardMessage?.trim() ?? '';
    if (!msg || seen.has(msg)) continue;
    seen.add(msg);
    const itemTitle = item.bouquetTitle?.trim() || undefined;
    fromItems.push(
      itemTitle
        ? { text: clipGiftCardMessage(msg), itemTitle }
        : { text: clipGiftCardMessage(msg) }
    );
    if (fromItems.length >= GIFT_CARD_MESSAGES_MAX_COUNT) break;
  }
  if (fromItems.length > 0) return fromItems;

  const greeting = order.customOrderDetails?.greetingCard?.trim();
  if (greeting) return [{ text: clipGiftCardMessage(greeting) }];

  return [];
}

/** Text-only helper (cart recovery, length checks). Prefer getOrderGiftCardEntries for display. */
export function getOrderGiftCardMessages(order: GiftCardMessagesSource): string[] {
  return getOrderGiftCardEntries(order).map((e) => e.text);
}

/** Formatted lines for clipboard / previews. */
export function getOrderGiftCardDisplayLines(order: GiftCardMessagesSource): string[] {
  return getOrderGiftCardEntries(order).map(formatGiftCardEntry);
}

export function giftCardMessageMaxLength(): number {
  return CHECKOUT_FIELD_LIMITS.giftCardMessage;
}
