import type { OfflineConversionStatus } from './types';
import { isGoogleAdsAttributed } from './rules';
import type { AttributionSnapshot } from './types';

export function isOrderPaidForAttribution(input: {
  paymentStatus?: string | null;
  paidAt?: string | null;
}): boolean {
  if (input.paidAt && String(input.paidAt).trim()) return true;
  return String(input.paymentStatus ?? '').trim().toUpperCase() === 'PAID';
}

export function offlineConversionStatusForPaidOrder(input: {
  paymentStatus?: string | null;
  paidAt?: string | null;
  grandTotal?: number | null;
  gclid?: string | null;
  gbraid?: string | null;
  wbraid?: string | null;
  googleClickAt?: number;
  nowMs?: number;
}): OfflineConversionStatus {
  if (!isOrderPaidForAttribution(input)) return 'not_applicable';
  const total = Number(input.grandTotal ?? 0);
  if (!Number.isFinite(total) || total <= 0) return 'not_applicable';

  const snap: AttributionSnapshot = {
    ...(input.gclid ? { gclid: input.gclid } : {}),
    ...(input.gbraid ? { gbraid: input.gbraid } : {}),
    ...(input.wbraid ? { wbraid: input.wbraid } : {}),
    ...(input.googleClickAt != null ? { googleClickAt: input.googleClickAt } : {}),
  };
  if (!isGoogleAdsAttributed(snap, input.nowMs ?? Date.now())) return 'not_applicable';
  return 'pending';
}

export function shouldInsertOfflineConversionRow(
  existing: { order_id: string; status: string } | null | undefined,
): boolean {
  return existing == null;
}

export const CLAIMABLE_OFFLINE_STATUSES: OfflineConversionStatus[] = ['pending', 'retry'];
