import 'server-only';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { normalizeAudienceEmail } from '@/lib/email/marketingAudience';

export type KnownContact = {
  email: string;
  name: string | null;
  orderCount: number;
  lastOrderAt: string | null;
  marketingConsent: boolean;
  newsletter: boolean;
  balance: number;
};

const PAGE_SIZE = 1000;
const MAX_ROWS = 20_000;

async function fetchAll<T>(
  build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>
): Promise<{ ok: true; rows: T[] } | { ok: false; error: string }> {
  const rows: T[] = [];
  for (let from = 0; from < MAX_ROWS; from += PAGE_SIZE) {
    const { data, error } = await build(from, from + PAGE_SIZE - 1);
    if (error) return { ok: false, error: error.message };
    rows.push(...(data ?? []));
    if ((data ?? []).length < PAGE_SIZE) break;
  }
  return { ok: true, rows };
}

/**
 * Everyone Lanna Bloom already knows: order customers + newsletter subscribers,
 * one row per lowercased email, with current credit balance. This is the only
 * pool credit may be issued to (enforced again server-side on issuance).
 */
export async function loadKnownContacts(): Promise<
  { ok: true; contacts: KnownContact[] } | { ok: false; error: string }
> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false, error: 'Supabase not configured' };

  const orders = await fetchAll<{
    customer_email: string | null;
    customer_name: string | null;
    created_at: string | null;
    marketing_email_consent: boolean | null;
  }>((from, to) =>
    supabase
      .from('orders')
      .select('customer_email, customer_name, created_at, marketing_email_consent')
      .not('customer_email', 'is', null)
      .order('created_at', { ascending: false })
      .range(from, to)
  );
  if (!orders.ok) return orders;

  const subs = await fetchAll<{ email: string }>((from, to) =>
    supabase.from('newsletter_subscribers').select('email').eq('status', 'active').range(from, to)
  );
  if (!subs.ok) return subs;

  const customers = await fetchAll<{ id: string; email: string }>((from, to) =>
    supabase.from('customers').select('id, email').range(from, to)
  );
  if (!customers.ok) return customers;

  const ledger = await fetchAll<{ customer_id: string; amount: number }>((from, to) =>
    supabase.from('credit_transactions').select('customer_id, amount').range(from, to)
  );
  if (!ledger.ok) return ledger;

  const balanceByCustomer = new Map<string, number>();
  for (const t of ledger.rows) {
    balanceByCustomer.set(t.customer_id, (balanceByCustomer.get(t.customer_id) ?? 0) + Number(t.amount));
  }
  const customerIdByEmail = new Map(customers.rows.map((c) => [c.email, c.id]));

  const byEmail = new Map<string, KnownContact>();
  const ensure = (email: string): KnownContact => {
    let c = byEmail.get(email);
    if (!c) {
      const id = customerIdByEmail.get(email);
      c = {
        email,
        name: null,
        orderCount: 0,
        lastOrderAt: null,
        marketingConsent: false,
        newsletter: false,
        balance: id ? balanceByCustomer.get(id) ?? 0 : 0,
      };
      byEmail.set(email, c);
    }
    return c;
  };

  for (const o of orders.rows) {
    const email = normalizeAudienceEmail(o.customer_email ?? '');
    if (!email.includes('@') || !email.includes('.')) continue;
    const c = ensure(email);
    c.orderCount += 1;
    if (!c.name && o.customer_name?.trim()) c.name = o.customer_name.trim();
    if (!c.lastOrderAt) c.lastOrderAt = o.created_at;
    if (o.marketing_email_consent) c.marketingConsent = true;
  }
  for (const s of subs.rows) {
    const email = normalizeAudienceEmail(s.email);
    if (email.includes('@')) ensure(email).newsletter = true;
  }

  return { ok: true, contacts: Array.from(byEmail.values()) };
}

/** Returns the subset of `emails` (normalized) that are known contacts. */
export async function filterKnownEmails(emails: string[]): Promise<Set<string>> {
  const supabase = getSupabaseAdmin();
  const known = new Set<string>();
  if (!supabase || emails.length === 0) return known;
  const list = Array.from(new Set(emails.map(normalizeAudienceEmail)));

  for (let i = 0; i < list.length; i += 100) {
    const chunk = list.slice(i, i + 100);
    const [o, n, c] = await Promise.all([
      supabase.from('orders').select('customer_email').in('customer_email', chunk),
      supabase.from('newsletter_subscribers').select('email').in('email', chunk),
      supabase.from('customers').select('email').in('email', chunk),
    ]);
    o.data?.forEach((r) => r.customer_email && known.add(normalizeAudienceEmail(r.customer_email)));
    n.data?.forEach((r) => known.add(normalizeAudienceEmail(r.email)));
    c.data?.forEach((r) => known.add(normalizeAudienceEmail(r.email)));
  }
  return known;
}
