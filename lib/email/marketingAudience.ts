/** Unique emails that opted in to marketing (checkout checkbox and/or newsletter). */

export type MarketingAudienceRow = {
  email: string;
  customerName: string | null;
  checkoutConsent: boolean;
  newsletter: boolean;
  newsletterSource: string | null;
  lastOrderId: string | null;
  lastOrderAt: string | null;
};

export type ConsentOrderRow = {
  order_id: string;
  customer_email: string | null;
  customer_name: string | null;
  created_at: string | null;
};

export type NewsletterSubscriberRow = {
  email: string;
  source: string | null;
  status: string;
};

export function normalizeAudienceEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isUsableEmail(email: string): boolean {
  return email.includes('@') && email.includes('.');
}

/**
 * Merge checkout marketing opt-ins (newest order first) with active newsletter signups.
 * One row per email. Newest consented order wins for name / last order.
 */
export function mergeMarketingAudience(
  ordersNewestFirst: ConsentOrderRow[],
  subscribers: NewsletterSubscriberRow[]
): MarketingAudienceRow[] {
  const byEmail = new Map<string, MarketingAudienceRow>();

  for (const row of ordersNewestFirst) {
    const email = normalizeAudienceEmail(row.customer_email ?? '');
    if (!isUsableEmail(email) || byEmail.has(email)) continue;
    const name = row.customer_name?.trim() || null;
    byEmail.set(email, {
      email,
      customerName: name,
      checkoutConsent: true,
      newsletter: false,
      newsletterSource: null,
      lastOrderId: row.order_id,
      lastOrderAt: row.created_at,
    });
  }

  for (const sub of subscribers) {
    if (sub.status !== 'active') continue;
    const email = normalizeAudienceEmail(sub.email);
    if (!isUsableEmail(email)) continue;
    const existing = byEmail.get(email);
    const source = sub.source?.trim() || null;
    if (existing) {
      existing.newsletter = true;
      existing.newsletterSource = source;
    } else {
      byEmail.set(email, {
        email,
        customerName: null,
        checkoutConsent: false,
        newsletter: true,
        newsletterSource: source,
        lastOrderId: null,
        lastOrderAt: null,
      });
    }
  }

  return Array.from(byEmail.values()).sort((a, b) => {
    if (a.lastOrderAt && b.lastOrderAt) {
      return a.lastOrderAt < b.lastOrderAt ? 1 : a.lastOrderAt > b.lastOrderAt ? -1 : a.email.localeCompare(b.email);
    }
    if (a.lastOrderAt) return -1;
    if (b.lastOrderAt) return 1;
    return a.email.localeCompare(b.email);
  });
}

export function marketingSourceLabel(row: MarketingAudienceRow): string {
  if (row.checkoutConsent && row.newsletter) return 'Checkout + newsletter';
  if (row.checkoutConsent) return 'Checkout';
  if (row.newsletter) return 'Newsletter';
  return '—';
}
