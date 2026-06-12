/**
 * Next scheduled Stripe → bank payout. Update when your Stripe payout schedule changes.
 * Used only for admin accounting UI hints (not financial calculations).
 */
export const STRIPE_NEXT_PAYOUT_DATE_ISO = '2026-04-21';

export function formatStripeNextPayoutShort(): string {
  return new Date(`${STRIPE_NEXT_PAYOUT_DATE_ISO}T12:00:00`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
