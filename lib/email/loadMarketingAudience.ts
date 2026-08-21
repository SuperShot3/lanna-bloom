import 'server-only';

import { getSupabaseAdmin } from '@/lib/supabase/server';
import {
  mergeMarketingAudience,
  type ConsentOrderRow,
  type MarketingAudienceRow,
  type NewsletterSubscriberRow,
} from './marketingAudience';

const PAGE_SIZE = 1000;
const MAX_ROWS = 10_000;

export async function loadMarketingAudience(): Promise<
  { ok: true; items: MarketingAudienceRow[] } | { ok: false; error: string }
> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false, error: 'Supabase not configured' };

  const orders: ConsentOrderRow[] = [];
  for (let from = 0; from < MAX_ROWS; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from('orders')
      .select('order_id, customer_email, customer_name, created_at')
      .eq('marketing_email_consent', true)
      .not('customer_email', 'is', null)
      .order('created_at', { ascending: false })
      .range(from, from + PAGE_SIZE - 1);
    if (error) return { ok: false, error: error.message };
    const page = (data ?? []) as ConsentOrderRow[];
    orders.push(...page);
    if (page.length < PAGE_SIZE) break;
  }

  const subscribers: NewsletterSubscriberRow[] = [];
  for (let from = 0; from < MAX_ROWS; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from('newsletter_subscribers')
      .select('email, source, status')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .range(from, from + PAGE_SIZE - 1);
    if (error) return { ok: false, error: error.message };
    const page = (data ?? []) as NewsletterSubscriberRow[];
    subscribers.push(...page);
    if (page.length < PAGE_SIZE) break;
  }

  return { ok: true, items: mergeMarketingAudience(orders, subscribers) };
}
