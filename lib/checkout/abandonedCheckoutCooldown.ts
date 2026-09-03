/** Max abandoned-checkout recovery emails per customer email. */
export const ABANDONED_CHECKOUT_EMAIL_COOLDOWN_HOURS = 24;

export function normalizeCheckoutRecoveryEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function abandonedCheckoutCooldownCutoffIso(
  now: Date,
  cooldownHours = ABANDONED_CHECKOUT_EMAIL_COOLDOWN_HOURS
): string {
  return new Date(now.getTime() - cooldownHours * 60 * 60 * 1000).toISOString();
}

/** True when a prior send is still inside the cooldown window. */
export function isAbandonedCheckoutEmailCooldownActive(
  lastSentAt: string | Date | null | undefined,
  now: Date,
  cooldownHours = ABANDONED_CHECKOUT_EMAIL_COOLDOWN_HOURS
): boolean {
  if (!lastSentAt) return false;
  const sent = typeof lastSentAt === 'string' ? new Date(lastSentAt) : lastSentAt;
  if (Number.isNaN(sent.getTime())) return false;
  return now.getTime() - sent.getTime() < cooldownHours * 60 * 60 * 1000;
}

type AbandonmentEmailRow = {
  customer_email: string;
  session_created_at: string;
};

/**
 * Newest cart per email. Input order does not matter; result is newest-first.
 */
export function selectLatestAbandonmentPerEmail<T extends AbandonmentEmailRow>(rows: T[]): T[] {
  const sorted = [...rows].sort((a, b) => {
    const tb = new Date(b.session_created_at).getTime();
    const ta = new Date(a.session_created_at).getTime();
    const nb = Number.isNaN(tb) ? 0 : tb;
    const na = Number.isNaN(ta) ? 0 : ta;
    return nb - na;
  });
  const seen = new Set<string>();
  const out: T[] = [];
  for (const row of sorted) {
    const email = normalizeCheckoutRecoveryEmail(row.customer_email);
    if (!email || seen.has(email)) continue;
    seen.add(email);
    out.push(row);
  }
  return out;
}
