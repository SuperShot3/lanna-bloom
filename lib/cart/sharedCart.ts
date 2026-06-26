import 'server-only';

import { nanoid } from 'nanoid';
import type { CartItem } from '@/contexts/CartContext';
import type { Locale } from '@/lib/i18n';
import { getBaseUrl } from '@/lib/orders';
import { getSupabaseAdmin } from '@/lib/supabase/server';

export const SHARED_CART_MAX_LINES = 20;
export const SHARED_CART_MAX_UNITS = 50;
const SHARED_CART_EXPIRY_DAYS = 3;

export type SharedCartPayload = {
  items: CartItem[];
  locale: Locale;
};

export class SharedCartValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SharedCartValidationError';
  }
}

export function normalizeSharedCartToken(raw: string | null): string | null {
  if (!raw) return null;
  const t = raw.trim();
  if (t.length < 8 || t.length > 128) return null;
  if (!/^[A-Za-z0-9_-]+$/.test(t)) return null;
  return t;
}

function clampQuantity(qty: unknown): number {
  const n = typeof qty === 'number' ? qty : Number(qty);
  if (!Number.isFinite(n)) return 1;
  return Math.min(99, Math.max(1, Math.floor(n)));
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isValidCartLine(item: unknown): item is CartItem {
  if (!item || typeof item !== 'object') return false;
  const row = item as CartItem;
  if (!isNonEmptyString(row.bouquetId)) return false;
  if (!isNonEmptyString(row.slug)) return false;
  if (!row.size || typeof row.size !== 'object') return false;
  if (!isNonEmptyString(row.size.optionId)) return false;
  if (typeof row.size.price !== 'number' || !Number.isFinite(row.size.price)) return false;
  return true;
}

/** Strip free-text fields and validate cart line shape for sharing. */
export function sanitizeCartItemsForShare(items: unknown): CartItem[] {
  if (!Array.isArray(items) || items.length === 0) {
    throw new SharedCartValidationError('Cart is empty');
  }
  if (items.length > SHARED_CART_MAX_LINES) {
    throw new SharedCartValidationError('Too many cart lines');
  }

  const sanitized: CartItem[] = [];
  let totalUnits = 0;

  for (const raw of items) {
    if (!isValidCartLine(raw)) {
      throw new SharedCartValidationError('Invalid cart item');
    }

    const qty = clampQuantity(raw.quantity);
    totalUnits += qty;
    if (totalUnits > SHARED_CART_MAX_UNITS) {
      throw new SharedCartValidationError('Too many items');
    }

    const addOnsRaw = raw.addOns && typeof raw.addOns === 'object' ? raw.addOns : {};
    const addOns = addOnsRaw as CartItem['addOns'];
    sanitized.push({
      itemType: raw.itemType,
      bouquetId: raw.bouquetId.trim(),
      slug: raw.slug.trim(),
      nameEn: typeof raw.nameEn === 'string' ? raw.nameEn : '',
      nameTh: typeof raw.nameTh === 'string' ? raw.nameTh : '',
      imageUrl: typeof raw.imageUrl === 'string' ? raw.imageUrl : undefined,
      size: raw.size,
      quantity: qty,
      excludedDeliveryDestinations: Array.isArray(raw.excludedDeliveryDestinations)
        ? raw.excludedDeliveryDestinations
        : undefined,
      addOns: {
        cardType: addOns.cardType ?? null,
        cardMessage: '',
        wrappingPreference: addOns.wrappingPreference ?? null,
        paperColor: addOns.paperColor ?? null,
        balloonText: '',
        productAddOns:
          addOns.productAddOns && typeof addOns.productAddOns === 'object'
            ? addOns.productAddOns
            : {},
      },
    });
  }

  return sanitized;
}

export function buildSharedCartUrl(lang: string, token: string): string {
  const base = getBaseUrl();
  const qs = new URLSearchParams({ share: token }).toString();
  return `${base}/${lang}/cart?${qs}`;
}

export async function createSharedCart(params: {
  items: unknown;
  locale: Locale;
}): Promise<{ url: string; token: string; expiresAt: string }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    throw new Error('Shared cart storage is not configured');
  }

  const items = sanitizeCartItemsForShare(params.items);
  const locale = params.locale === 'th' ? 'th' : 'en';
  const token = nanoid(21);
  const expiresAt = new Date(
    Date.now() + SHARED_CART_EXPIRY_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();

  const { error } = await supabase.from('shared_carts').insert({
    public_token: token,
    items_json: items,
    locale,
    expires_at: expiresAt,
  });

  if (error) {
    console.error('[sharedCart] insert failed', error);
    throw new Error('Could not create shared cart');
  }

  return {
    url: buildSharedCartUrl(locale, token),
    token,
    expiresAt,
  };
}

export async function getSharedCartByToken(
  token: string
): Promise<SharedCartPayload | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('shared_carts')
    .select('items_json, locale, expires_at')
    .eq('public_token', token)
    .maybeSingle();

  if (error || !data) return null;

  const expiresAt = data.expires_at ? new Date(String(data.expires_at)) : null;
  if (!expiresAt || Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= Date.now()) {
    return null;
  }

  const locale = data.locale === 'th' ? 'th' : 'en';
  let items: CartItem[];
  try {
    items = sanitizeCartItemsForShare(data.items_json);
  } catch {
    return null;
  }

  return { items, locale };
}
