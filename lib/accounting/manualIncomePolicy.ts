/**
 * When true, marking a non-Stripe order as paid (mark-paid / payment-status → PAID)
 * does **not** auto-create an `income_records` row — staff must add revenue from
 * Accounting → Income. Stripe checkouts always record income automatically.
 */
export function shouldDeferManualPaidIncomeUpsert(): boolean {
  const v = process.env.ACCOUNTING_MANUAL_PAID_INCOME_DEFERRED;
  return v === '1' || v === 'true' || v === 'yes';
}
