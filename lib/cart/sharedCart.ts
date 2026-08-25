import 'server-only';

import { nanoid } from 'nanoid';
import type { CartItem } from '@/contexts/CartContext';
import type { RecoveredCartForm } from '@/lib/checkout/recoveredCartForm';
import type { Locale } from '@/lib/i18n';
import { getBaseUrl } from '@/lib/orders';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import {
  sanitizeCartItemsForShare,
  sanitizeSharedCartForm,
  sanitizeSharedCartGiftMessages,
} from '@/lib/cart/sharedCartSanitize';

export {
  SHARED_CART_MAX_LINES,
  SHARED_CART_MAX_UNITS,
  SharedCartValidationError,
  sanitizeCartItemsForShare,
} from '@/lib/cart/sharedCartSanitize';

const SHARED_CART_EXPIRY_DAYS = 3;

export type SharedCartPayload = {
  items: CartItem[];
  locale: Locale;
  form: RecoveredCartForm | null;
  giftCardMessages: string[] | null;
};

export function normalizeSharedCartToken(raw: string | null): string | null {
  if (!raw) return null;
  const t = raw.trim();
  if (t.length < 8 || t.length > 128) return null;
  if (!/^[A-Za-z0-9_-]+$/.test(t)) return null;
  return t;
}

export function buildSharedCartUrl(lang: string, token: string): string {
  const base = getBaseUrl();
  const qs = new URLSearchParams({ share: token }).toString();
  return `${base}/${lang}/cart?${qs}`;
}

export async function createSharedCart(params: {
  items: unknown;
  locale: Locale;
  form?: unknown;
  giftCardMessages?: unknown;
}): Promise<{ url: string; token: string; expiresAt: string }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    throw new Error('Shared cart storage is not configured');
  }

  const items = sanitizeCartItemsForShare(params.items);
  const form = sanitizeSharedCartForm(params.form);
  const giftCardMessages = sanitizeSharedCartGiftMessages(params.giftCardMessages);
  const locale = params.locale === 'th' ? 'th' : 'en';
  const token = nanoid(21);
  const expiresAt = new Date(
    Date.now() + SHARED_CART_EXPIRY_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();

  const { error } = await supabase.from('shared_carts').insert({
    public_token: token,
    items_json: items,
    locale,
    form_json: form,
    gift_card_messages_json: giftCardMessages,
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
    .select('items_json, locale, form_json, gift_card_messages_json, expires_at')
    .eq('public_token', token)
    .maybeSingle();

  let row: {
    items_json: unknown;
    locale: unknown;
    form_json?: unknown;
    gift_card_messages_json?: unknown;
    expires_at: unknown;
  } | null = data;

  if (error) {
    const retry = await supabase
      .from('shared_carts')
      .select('items_json, locale, expires_at')
      .eq('public_token', token)
      .maybeSingle();
    if (retry.error || !retry.data) return null;
    row = retry.data;
  }

  if (!row) return null;

  const expiresAt = row.expires_at ? new Date(String(row.expires_at)) : null;
  if (!expiresAt || Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= Date.now()) {
    return null;
  }

  const locale = row.locale === 'th' ? 'th' : 'en';
  let items: CartItem[];
  try {
    items = sanitizeCartItemsForShare(row.items_json);
  } catch {
    return null;
  }

  return {
    items,
    locale,
    form: sanitizeSharedCartForm(row.form_json),
    giftCardMessages: sanitizeSharedCartGiftMessages(row.gift_card_messages_json),
  };
}
