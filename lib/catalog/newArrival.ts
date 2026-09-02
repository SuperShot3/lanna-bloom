/** Storefront New Arrival window length (days). */
export const NEW_ARRIVAL_WINDOW_DAYS = 45;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function parseIso(value: string | null | undefined): Date | null {
  if (!value || typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const d = new Date(trimmed);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Inclusive start; exclusive end at startedAt + 45 days. */
export function isCatalogNewArrival(
  startedAt: string | null | undefined,
  now: Date = new Date()
): boolean {
  const start = parseIso(startedAt);
  if (!start) return false;
  if (start.getTime() > now.getTime()) return false;
  const expiresAt = start.getTime() + NEW_ARRIVAL_WINDOW_DAYS * MS_PER_DAY;
  return now.getTime() < expiresAt;
}

export function newArrivalExpiresAt(
  startedAt: string | null | undefined
): string | null {
  const start = parseIso(startedAt);
  if (!start) return null;
  return new Date(start.getTime() + NEW_ARRIVAL_WINDOW_DAYS * MS_PER_DAY).toISOString();
}

/**
 * First go-live auto-starts New Arrival when the column is still NULL and the
 * bouquet has never been approved. Re-approval after admin end (NULL + prior
 * approved_at) does not restart.
 */
export function resolveNewArrivalStartedAtOnApprove(input: {
  previousStartedAt: string | null | undefined;
  previouslyApprovedAt: string | null | undefined;
  now?: Date;
}): string | null {
  if (input.previousStartedAt) return input.previousStartedAt;
  if (input.previouslyApprovedAt) return null;
  return (input.now ?? new Date()).toISOString();
}

/**
 * Admin checkbox → timestamp. Keep the current window if still active; restart
 * with `now` when enabling an expired/null window; clear when disabling.
 */
export function resolveNewArrivalStartedAtFromAdminToggle(input: {
  enabled: boolean;
  previousStartedAt: string | null | undefined;
  now?: Date;
}): string | null {
  if (!input.enabled) return null;
  const now = input.now ?? new Date();
  if (isCatalogNewArrival(input.previousStartedAt, now)) {
    return input.previousStartedAt ?? now.toISOString();
  }
  return now.toISOString();
}

/**
 * Whether an admin form should persist New Arrival intent.
 * Unchanged checkbox must not be written (avoids clearing auto-start on Save).
 */
export function shouldPersistNewArrivalAdminIntent(input: {
  formEnabled: boolean;
  liveStartedAt: string | null | undefined;
  now?: Date;
}): boolean {
  const liveEnabled = isCatalogNewArrival(input.liveStartedAt, input.now);
  return input.formEnabled !== liveEnabled;
}

export function compareBouquetsByNewest(
  aStartedAt: string | null | undefined,
  bStartedAt: string | null | undefined
): number {
  const a = parseIso(aStartedAt)?.getTime() ?? 0;
  const b = parseIso(bStartedAt)?.getTime() ?? 0;
  return b - a;
}
