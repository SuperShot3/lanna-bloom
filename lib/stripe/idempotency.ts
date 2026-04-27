import { createHash } from 'crypto';

export function stripeIdempotencyFingerprint(value: unknown): string {
  return createHash('sha256')
    .update(JSON.stringify(value))
    .digest('hex')
    .slice(0, 16);
}
