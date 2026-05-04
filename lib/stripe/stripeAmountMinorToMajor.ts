/**
 * Convert Stripe API integer amounts (minor units) to major display units.
 * See Stripe docs: zero-decimal currencies vs two-decimal (e.g. THB uses satang).
 */

const ZERO_DECIMAL_CURRENCIES = new Set([
  'bif',
  'clp',
  'djf',
  'gnf',
  'jpy',
  'kmf',
  'krw',
  'mga',
  'pyg',
  'rwf',
  'vnd',
  'vuv',
  'xaf',
  'xof',
  'xpf',
]);

export function stripeAmountMinorToMajor(minor: number, currency: string): number {
  const c = currency.toLowerCase();
  if (ZERO_DECIMAL_CURRENCIES.has(c)) return minor;
  return minor / 100;
}
