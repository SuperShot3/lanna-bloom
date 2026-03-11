import 'server-only';

import Stripe from 'stripe';

export type StripeMode = 'test' | 'live' | 'unknown';

export interface StripeServerConfig {
  secretKey: string;
  webhookSecret?: string;
  mode: StripeMode;
}

export function getStripeModeFromSecretKey(secretKey: string | undefined): StripeMode {
  if (!secretKey) return 'unknown';
  if (secretKey.startsWith('sk_test_')) return 'test';
  if (secretKey.startsWith('sk_live_')) return 'live';
  return 'unknown';
}

export function getStripeServerConfig(): StripeServerConfig | null {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secretKey) return null;

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim() || undefined;

  return {
    secretKey,
    webhookSecret,
    mode: getStripeModeFromSecretKey(secretKey),
  };
}

export function createStripeServerClient(secretKey: string): Stripe {
  return new Stripe(secretKey);
}
