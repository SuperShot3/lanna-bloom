import { netAfterProcessingFee, processingFeeForIncome } from '@/lib/accounting/stripeFee';
import type { IncomePaymentMethod } from '@/types/accounting';

export type OverviewRefundAllocatorIncome = {
  order_id?: unknown;
  amount?: unknown;
  income_status?: unknown;
  payment_method?: unknown;
  processing_fee_amount?: unknown;
};

export type OverviewRefundAllocatorRefund = {
  order_id?: unknown;
  amount?: unknown;
  source?: unknown;
  retained_fee_amount?: unknown;
};

export type AllocatedOverviewRefunds = {
  confirmedIncome: number;
  confirmedIncomeCount: number;
  stripeProcessingFees: number;
  confirmedIncomeNet: number;
  stripeConfirmedGross: number;
  stripeConfirmedNetBeforeRefunds: number;
  offStripeConfirmedGross: number;
  offStripeConfirmedNet: number;
  /** Refund amounts this period that were not already removed from gross (partial + prior-period). */
  refundsPnlAmount: number;
  totalRefunds: number;
  refundsCount: number;
  retainedStripeFeesOnRefunds: number;
  stripeRefundsInPeriod: number;
  offStripeRefundsInPeriod: number;
  stripeNetVolumeAfterRefunds: number;
  offStripeNetAfterRefunds: number;
  confirmedIncomeNetAfterRefunds: number;
};

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

function parseAmount(raw: unknown): number {
  return parseFloat(String(raw ?? 0)) || 0;
}

function orderKey(raw: unknown): string | null {
  const s = String(raw ?? '').trim();
  return s || null;
}

function isStripePm(pm: string | null | undefined): boolean {
  return String(pm ?? '').trim().toLowerCase() === 'stripe';
}

function feeForIncomeRow(gross: number, pm: IncomePaymentMethod, feeStored: unknown): number {
  if (feeStored != null && String(feeStored) !== '') {
    return parseFloat(String(feeStored)) || 0;
  }
  return processingFeeForIncome(gross, pm);
}

/** Explicit fee on the refund row, or null if none was stored. */
function retainedFeeFromRefundRows(refunds: OverviewRefundAllocatorRefund[]): number | null {
  for (const r of refunds) {
    const raw = r.retained_fee_amount;
    if (raw != null && String(raw) !== '') {
      const n = parseFloat(String(raw));
      if (Number.isFinite(n) && n >= 0) return roundMoney(n);
    }
  }
  return null;
}

function refundSource(list: OverviewRefundAllocatorRefund[]): string {
  return String(list[0]?.source ?? '').toLowerCase();
}

/**
 * Stripe-channel refund: original sale was Stripe, Stripe webhook, or an admin
 * refund that stored a retained Stripe fee when no sale lookup is available.
 */
function isStripeChannelRefund(
  source: string,
  lookupPm: string | null | undefined,
  retainedFee: number | null
): boolean {
  if (lookupPm && isStripePm(lookupPm)) return true;
  if (source === 'stripe') return true;
  if (!lookupPm && retainedFee != null && retainedFee > 0) return true;
  return false;
}

function lookupFee(row: OverviewRefundAllocatorIncome | undefined): number {
  if (!row) return 0;
  const gross = parseAmount(row.amount);
  return feeForIncomeRow(gross, row.payment_method as IncomePaymentMethod, row.processing_fee_amount);
}

/**
 * Period overview: refunds are not income.
 * Same-period full refunds drop out of gross and order count; retained Stripe
 * fees remain as shop loss. Partial / prior-period refunds reduce a Refunds P&L
 * line instead of Non-Stripe income. Prior-period admin Stripe refunds also
 * subtract retained commission once.
 */
export function allocateOverviewRefunds(input: {
  incomeRows: OverviewRefundAllocatorIncome[] | null | undefined;
  refunds: OverviewRefundAllocatorRefund[] | null | undefined;
  /** Income for refunded orders whose sale is not in this period (fee + channel). */
  incomeLookup?: OverviewRefundAllocatorIncome[] | null;
}): AllocatedOverviewRefunds {
  const lookupByOrder = new Map<string, OverviewRefundAllocatorIncome>();
  for (const row of input.incomeLookup ?? []) {
    const oid = orderKey(row.order_id);
    if (oid) lookupByOrder.set(oid, row);
  }

  const refunds = input.refunds ?? [];
  const refundsByOrder = new Map<string, OverviewRefundAllocatorRefund[]>();
  let totalRefunds = 0;
  for (const r of refunds) {
    totalRefunds += parseAmount(r.amount);
    const oid = orderKey(r.order_id);
    if (!oid) continue;
    const list = refundsByOrder.get(oid) ?? [];
    list.push(r);
    refundsByOrder.set(oid, list);
  }
  totalRefunds = roundMoney(totalRefunds);

  const refundedAmountByOrder = new Map<string, number>();
  for (const [oid, list] of Array.from(refundsByOrder.entries())) {
    let sum = 0;
    for (const r of list) sum += parseAmount(r.amount);
    refundedAmountByOrder.set(oid, roundMoney(sum));
  }

  type ConfirmedRow = {
    orderId: string | null;
    gross: number;
    pm: IncomePaymentMethod;
    fee: number;
    net: number;
    excluded: boolean;
  };

  const confirmed: ConfirmedRow[] = [];
  const excludedOrderIds = new Set<string>();

  for (const row of input.incomeRows ?? []) {
    if (String(row.income_status ?? '') !== 'confirmed') continue;
    const gross = parseAmount(row.amount);
    const pm = row.payment_method as IncomePaymentMethod;
    const fee = feeForIncomeRow(gross, pm, row.processing_fee_amount);
    const net = netAfterProcessingFee(gross, fee);
    const oid = orderKey(row.order_id);
    const refunded = oid ? refundedAmountByOrder.get(oid) ?? 0 : 0;
    const excluded = oid != null && refunded + 0.001 >= gross && gross > 0;
    if (excluded && oid) excludedOrderIds.add(oid);
    confirmed.push({ orderId: oid, gross, pm, fee, net, excluded });
  }

  let confirmedIncome = 0;
  let confirmedIncomeCount = 0;
  let stripeProcessingFees = 0;
  let confirmedIncomeNet = 0;
  let stripeConfirmedGross = 0;
  let stripeConfirmedNetBeforeRefunds = 0;
  let offStripeConfirmedGross = 0;
  let offStripeConfirmedNet = 0;

  const keptStripeByOrder = new Map<string, ConfirmedRow>();
  const keptOffByOrder = new Map<string, ConfirmedRow>();

  for (const row of confirmed) {
    if (row.excluded) continue;
    confirmedIncomeCount += 1;
    confirmedIncome += row.gross;
    confirmedIncomeNet += row.net;
    if (isStripePm(row.pm)) {
      stripeProcessingFees += row.fee;
      stripeConfirmedGross += row.gross;
      stripeConfirmedNetBeforeRefunds += row.net;
      if (row.orderId) keptStripeByOrder.set(row.orderId, row);
    } else {
      offStripeConfirmedGross += row.gross;
      offStripeConfirmedNet += row.net;
      if (row.orderId) keptOffByOrder.set(row.orderId, row);
    }
  }

  let inPeriodPartialStripe = 0;
  let inPeriodPartialOff = 0;
  let priorOrOrphanStripe = 0;
  let priorOrOrphanOff = 0;
  let retainedStripeFeesOnRefunds = 0;

  const retainedFeeCounted = new Set<string>();

  const addRetainedFee = (oid: string, amount: number) => {
    if (retainedFeeCounted.has(oid) || amount <= 0) return;
    retainedStripeFeesOnRefunds += amount;
    retainedFeeCounted.add(oid);
  };

  for (const [oid, list] of Array.from(refundsByOrder.entries())) {
    const source = refundSource(list);
    const storedRetained = retainedFeeFromRefundRows(list);

    if (excludedOrderIds.has(oid)) {
      const income = confirmed.find((c) => c.orderId === oid);
      if (income && isStripePm(income.pm)) {
        addRetainedFee(oid, storedRetained ?? income.fee);
      }
      continue;
    }

    const amount = refundedAmountByOrder.get(oid) ?? 0;
    if (keptStripeByOrder.has(oid)) {
      inPeriodPartialStripe += amount;
      continue;
    }
    if (keptOffByOrder.has(oid)) {
      inPeriodPartialOff += amount;
      continue;
    }

    const lookup = lookupByOrder.get(oid);
    const lookupPm = lookup ? String(lookup.payment_method ?? '') : null;
    if (isStripeChannelRefund(source, lookupPm, storedRetained)) {
      priorOrOrphanStripe += amount;
      const extraFee =
        storedRetained ??
        (source !== 'stripe' && lookup && isStripePm(lookupPm) ? lookupFee(lookup) : 0);
      addRetainedFee(oid, extraFee);
    } else {
      priorOrOrphanOff += amount;
    }
  }

  for (const r of refunds) {
    if (orderKey(r.order_id)) continue;
    const amount = parseAmount(r.amount);
    const source = String(r.source ?? '').toLowerCase();
    const storedRetained = retainedFeeFromRefundRows([r]);
    if (source === 'stripe' || (storedRetained != null && storedRetained > 0)) {
      priorOrOrphanStripe += amount;
      if (storedRetained != null && storedRetained > 0) {
        retainedStripeFeesOnRefunds += storedRetained;
      }
    } else {
      priorOrOrphanOff += amount;
    }
  }

  const refundsPnlAmount = roundMoney(
    inPeriodPartialStripe + inPeriodPartialOff + priorOrOrphanStripe + priorOrOrphanOff
  );
  const stripeRefundsInPeriod = roundMoney(inPeriodPartialStripe + priorOrOrphanStripe);
  const offStripeRefundsInPeriod = roundMoney(inPeriodPartialOff + priorOrOrphanOff);
  retainedStripeFeesOnRefunds = roundMoney(retainedStripeFeesOnRefunds);

  const stripeNetVolumeAfterRefunds = roundMoney(
    stripeConfirmedNetBeforeRefunds - stripeRefundsInPeriod - retainedStripeFeesOnRefunds
  );
  const offStripeNetAfterRefunds = roundMoney(offStripeConfirmedNet - inPeriodPartialOff);
  const confirmedIncomeNetAfterRefunds = roundMoney(
    confirmedIncomeNet - refundsPnlAmount - retainedStripeFeesOnRefunds
  );

  return {
    confirmedIncome: roundMoney(confirmedIncome),
    confirmedIncomeCount,
    stripeProcessingFees: roundMoney(stripeProcessingFees),
    confirmedIncomeNet: roundMoney(confirmedIncomeNet),
    stripeConfirmedGross: roundMoney(stripeConfirmedGross),
    stripeConfirmedNetBeforeRefunds: roundMoney(stripeConfirmedNetBeforeRefunds),
    offStripeConfirmedGross: roundMoney(offStripeConfirmedGross),
    offStripeConfirmedNet: roundMoney(offStripeConfirmedNet),
    refundsPnlAmount,
    totalRefunds,
    refundsCount: refunds.length,
    retainedStripeFeesOnRefunds,
    stripeRefundsInPeriod,
    offStripeRefundsInPeriod,
    stripeNetVolumeAfterRefunds,
    offStripeNetAfterRefunds,
    confirmedIncomeNetAfterRefunds,
  };
}
