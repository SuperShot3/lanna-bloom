/**
 * Order-level gift card messages (1–3 free cards per order).
 * Prefer `order.giftCardMessages`; fall back to legacy per-item cardMessage (deduped).
 * `itemTitle` is ops metadata (which flower the card belongs to) — never merge into message text.
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

/**
 * Card message body only — exactly what the customer typed.
 * Never prepend itemTitle / product names (ops labels stay separate).
 */
export function formatGiftCardEntry(entry: OrderGiftCardEntry): string {
  return entry.text.trim();
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

/** Customer message texts for clipboard / previews (no product-name prefix). */
export function getOrderGiftCardDisplayLines(order: GiftCardMessagesSource): string[] {
  return getOrderGiftCardEntries(order).map(formatGiftCardEntry);
}

export function giftCardMessageMaxLength(): number {
  return CHECKOUT_FIELD_LIMITS.giftCardMessage;
}

export function giftCardEntriesEqual(a: OrderGiftCardEntry[], b: OrderGiftCardEntry[]): boolean {
  if (a.length !== b.length) return false;
  return a.every(
    (e, i) => e.text === b[i]?.text && (e.itemTitle ?? '') === (b[i]?.itemTitle ?? '')
  );
}

/** Joined customer-facing card body for audit / history (empty → null). */
export function giftCardEntriesAuditDisplay(entries: OrderGiftCardEntry[]): string | null {
  const s = entries
    .map((e) => formatGiftCardEntry(e))
    .filter(Boolean)
    .join('\n\n')
    .trim();
  return s || null;
}

function giftCardSourceFromOrderJson(orderJson: Record<string, unknown>): GiftCardMessagesSource {
  return {
    giftCardMessages: Array.isArray(orderJson.giftCardMessages)
      ? (orderJson.giftCardMessages as Array<string | OrderGiftCardEntry>)
      : null,
    items: Array.isArray(orderJson.items)
      ? (orderJson.items as GiftCardMessagesSource['items'])
      : null,
    customOrderDetails:
      orderJson.customOrderDetails && typeof orderJson.customOrderDetails === 'object'
        ? (orderJson.customOrderDetails as { greetingCard?: string | null })
        : null,
  };
}

function mergePreservedItemTitles(
  incoming: OrderGiftCardEntry[],
  current: OrderGiftCardEntry[]
): OrderGiftCardEntry[] {
  return incoming.map((e, i) => {
    if (e.itemTitle) return e;
    const prev = current[i]?.itemTitle;
    return prev ? { text: e.text, itemTitle: prev } : { text: e.text };
  });
}

function withClearedItemCardMessages(items: unknown): { items: unknown[]; cleared: boolean } | null {
  if (!Array.isArray(items)) return null;
  let cleared = false;
  const next = items.map((item) => {
    if (!item || typeof item !== 'object') return item;
    const rec = item as Record<string, unknown>;
    const addOns = rec.addOns;
    if (!addOns || typeof addOns !== 'object') return item;
    const ao = addOns as Record<string, unknown>;
    const msg = typeof ao.cardMessage === 'string' ? ao.cardMessage.trim() : '';
    if (!msg) return item;
    cleared = true;
    return { ...rec, addOns: { ...ao, cardMessage: '' } };
  });
  return { items: next, cleared };
}

function withSyncedGreetingCard(
  custom: unknown,
  firstText: string
): { custom: Record<string, unknown>; changed: boolean } | null {
  if (!custom || typeof custom !== 'object') return null;
  const rec = custom as Record<string, unknown>;
  if (!('greetingCard' in rec)) return null;
  const current = typeof rec.greetingCard === 'string' ? rec.greetingCard : '';
  if (current === firstText) return { custom: rec, changed: false };
  return { custom: { ...rec, greetingCard: firstText }, changed: true };
}

export function parseCardTextPatch(
  body: unknown
): { ok: true; giftCardMessages: unknown[] } | { ok: false; error: string } {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, error: 'Invalid JSON body' };
  }
  if (!('giftCardMessages' in body)) {
    return { ok: false, error: 'giftCardMessages required' };
  }
  const raw = (body as { giftCardMessages?: unknown }).giftCardMessages;
  if (!Array.isArray(raw)) {
    return { ok: false, error: 'giftCardMessages must be an array' };
  }
  return { ok: true, giftCardMessages: raw };
}

export type ApplyAdminCardTextResult =
  | {
      ok: true;
      nextJson: Record<string, unknown>;
      from: OrderGiftCardEntry[];
      to: OrderGiftCardEntry[];
      fromDisplay: string | null;
      toDisplay: string | null;
      changed: boolean;
    }
  | { ok: false; error: string };

/**
 * Admin write of order-level gift card messages.
 * Always sets `giftCardMessages`. Clears legacy item `cardMessage` and syncs
 * `customOrderDetails.greetingCard` when that key already exists so reads cannot
 * resurrect old text after a wipe.
 */
export function applyAdminCardTextToOrderJson(
  orderJson: Record<string, unknown> | null | undefined,
  incoming: unknown
): ApplyAdminCardTextResult {
  if (!Array.isArray(incoming)) {
    return { ok: false, error: 'giftCardMessages must be an array' };
  }

  const existing =
    orderJson && typeof orderJson === 'object' && !Array.isArray(orderJson) ? { ...orderJson } : {};
  const from = getOrderGiftCardEntries(giftCardSourceFromOrderJson(existing));
  const to = mergePreservedItemTitles(normalizeGiftCardMessagesForPersist(incoming), from);

  const itemsPatch = withClearedItemCardMessages(existing.items);
  const greetingPatch = withSyncedGreetingCard(existing.customOrderDetails, to[0]?.text ?? '');

  const nextJson: Record<string, unknown> = {
    ...existing,
    giftCardMessages: to,
  };
  if (itemsPatch) {
    nextJson.items = itemsPatch.items;
  }
  if (greetingPatch) {
    nextJson.customOrderDetails = greetingPatch.custom;
  }

  const changed =
    !giftCardEntriesEqual(from, to) ||
    Boolean(itemsPatch?.cleared) ||
    Boolean(greetingPatch?.changed);

  return {
    ok: true,
    nextJson,
    from,
    to,
    fromDisplay: giftCardEntriesAuditDisplay(from),
    toDisplay: giftCardEntriesAuditDisplay(to),
    changed,
  };
}
