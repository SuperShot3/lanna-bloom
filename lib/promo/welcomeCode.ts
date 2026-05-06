import 'server-only';
import { getSupabaseAdmin } from '@/lib/supabase/server';

const WELCOME_CODE_PREFIX = 'WELCOME10-';

// Confusion-safe alphabet (no 0/O/1/I/L)
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function isWelcomeCode(code: string | null | undefined): boolean {
  return typeof code === 'string' && code.trim().toUpperCase().startsWith(WELCOME_CODE_PREFIX);
}

export function generateWelcomeCode(): string {
  const chars = [];
  for (let i = 0; i < 6; i++) {
    const idx = Math.floor(Math.random() * CODE_ALPHABET.length);
    chars.push(CODE_ALPHABET[idx]);
  }
  return `${WELCOME_CODE_PREFIX}${chars.join('')}`;
}

export async function createWelcomeCodeForSubscriber(
  email: string
): Promise<{ ok: true; code: string } | { ok: false; error: string }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false, error: 'Supabase not configured' };

  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return { ok: false, error: 'Email is required' };

  for (let attempt = 0; attempt < 3; attempt++) {
    const code = generateWelcomeCode();
    const { error } = await supabase.from('welcome_codes').insert({
      email: normalizedEmail,
      code,
      discount_type: 'percent',
      discount_value: 10,
    });

    if (!error) return { ok: true, code };

    // Unique violation (code collision): retry a few times.
    if (error.code === '23505') continue;

    return { ok: false, error: error.message || 'Failed to create welcome code' };
  }

  return { ok: false, error: 'Failed to generate a unique code. Please try again.' };
}

export type DbWelcomeCode =
  | {
      valid: true;
      id: string;
      code: string;
      discountType: 'percent' | 'fixed' | 'free_delivery';
      discountValue: number;
      email: string;
    }
  | { valid: false; reason: 'not_found' | 'redeemed' | 'expired' | 'invalid' };

export async function lookupDbWelcomeCode(codeRaw: string): Promise<DbWelcomeCode> {
  const code = codeRaw.trim().toUpperCase();
  if (!code || !code.startsWith(WELCOME_CODE_PREFIX) || code.length <= WELCOME_CODE_PREFIX.length) {
    return { valid: false, reason: 'invalid' };
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) return { valid: false, reason: 'not_found' };

  const { data, error } = await supabase
    .from('welcome_codes')
    .select('id, code, email, discount_type, discount_value, expires_at, redeemed_at')
    .eq('code', code)
    .maybeSingle();

  if (error || !data) return { valid: false, reason: 'not_found' };

  if (data.redeemed_at) return { valid: false, reason: 'redeemed' };
  if (data.expires_at && new Date(data.expires_at).getTime() <= Date.now()) {
    return { valid: false, reason: 'expired' };
  }

  const discountType = (data.discount_type as DbWelcomeCode extends { valid: true }
    ? DbWelcomeCode['discountType']
    : never) as 'percent' | 'fixed' | 'free_delivery';

  const discountValue = Number(data.discount_value ?? 0);

  return {
    valid: true,
    id: String(data.id),
    code: String(data.code),
    email: String(data.email),
    discountType,
    discountValue,
  };
}

export async function redeemWelcomeCode(params: {
  welcomeCodeId: string;
  redeemedOrderId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false, error: 'Supabase not configured' };

  const now = new Date().toISOString();
  const { error } = await supabase
    .from('welcome_codes')
    .update({ redeemed_at: now, redeemed_order_id: params.redeemedOrderId })
    .eq('id', params.welcomeCodeId)
    .is('redeemed_at', null);

  if (error) return { ok: false, error: error.message || 'Failed to redeem code' };
  return { ok: true };
}
