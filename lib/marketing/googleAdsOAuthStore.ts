import 'server-only';

import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';
import { getSupabaseAdmin } from '@/lib/supabase/server';

const TABLE = 'marketing_google_ads_oauth';
const SINGLETON_ID = 1;

export interface StoredGoogleAdsOAuth {
  refreshToken: string;
  connectedAt: string | null;
  connectedByEmail: string | null;
}

function isMissingRelationError(error: { message?: string; code?: string } | null | undefined): boolean {
  if (!error) return false;
  const msg = String(error.message ?? '').toLowerCase();
  return (
    error.code === '42P01' ||
    error.code === 'PGRST205' ||
    (msg.includes('marketing_google_ads_oauth') && msg.includes('does not exist')) ||
    msg.includes('could not find the table')
  );
}

function encryptionKey(): Buffer {
  const secret = process.env.AUTH_SECRET?.trim();
  if (!secret) {
    throw new Error('AUTH_SECRET is required to store Google Ads tokens.');
  }
  return createHash('sha256').update(secret).digest();
}

export function encryptRefreshToken(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString('base64url')}:${tag.toString('base64url')}:${encrypted.toString('base64url')}`;
}

export function decryptRefreshToken(ciphertext: string): string | null {
  const parts = ciphertext.split(':');
  if (parts.length !== 4 || parts[0] !== 'v1') return null;
  try {
    const [, ivB64, tagB64, dataB64] = parts;
    const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(ivB64, 'base64url'));
    decipher.setAuthTag(Buffer.from(tagB64, 'base64url'));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(dataB64, 'base64url')),
      decipher.final(),
    ]);
    return decrypted.toString('utf8');
  } catch {
    return null;
  }
}

export async function loadStoredGoogleAdsOAuth(): Promise<StoredGoogleAdsOAuth | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from(TABLE)
    .select('refresh_token_ciphertext, connected_at, connected_by_email')
    .eq('id', SINGLETON_ID)
    .maybeSingle();

  if (error) {
    if (isMissingRelationError(error)) return null;
    console.error('[google-ads-oauth] failed to load stored token');
    return null;
  }
  if (!data?.refresh_token_ciphertext) return null;

  const refreshToken = decryptRefreshToken(data.refresh_token_ciphertext);
  if (!refreshToken) return null;

  return {
    refreshToken,
    connectedAt: typeof data.connected_at === 'string' ? data.connected_at : null,
    connectedByEmail: typeof data.connected_by_email === 'string' ? data.connected_by_email : null,
  };
}

export async function saveStoredGoogleAdsOAuth(input: {
  refreshToken: string;
  connectedByEmail: string | null;
}): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    throw new Error('Supabase is not configured — cannot save the Google Ads reconnect token.');
  }

  const now = new Date().toISOString();
  const { error } = await supabase.from(TABLE).upsert(
    {
      id: SINGLETON_ID,
      refresh_token_ciphertext: encryptRefreshToken(input.refreshToken),
      connected_by_email: input.connectedByEmail,
      connected_at: now,
      updated_at: now,
    },
    { onConflict: 'id' },
  );

  if (error) {
    if (isMissingRelationError(error)) {
      throw new Error(
        'Google Ads reconnect storage is missing. Apply supabase migration 20260821150000_marketing_google_ads_oauth.sql, then try again.',
      );
    }
    throw new Error('Failed to save the Google Ads reconnect token.');
  }
}
