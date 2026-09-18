/**
 * Store-credit hard limits. Single source of truth (same convention as
 * lib/delivery/zones.ts) — do not duplicate these numbers elsewhere. These are
 * passed into the DB RPCs, which re-enforce them server-side; the UI only uses
 * them for hints, never as the actual guard.
 */
export const REWARD_LIMITS = {
  /** Max a single reward/campaign issuance can grant to one customer. */
  maxIssuePerReward: 500,
  /** Max total store-credit balance a customer may hold at once. */
  maxCustomerBalance: 1000,
  /** Max credit that may be spent on a single order. */
  maxSpendPerOrder: 300,
  /** Minutes an unattached checkout redemption reservation is held before the cron reverses it. */
  reservationExpiryMinutes: 60,
  /** Default expiry window (days) applied to issued credit when the caller doesn't set its own. */
  defaultIssuedCreditExpiryDays: 90,
} as const;
