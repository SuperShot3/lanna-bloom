import 'server-only';

import { getSupabaseAdmin } from '@/lib/supabase/server';
import { isMissingAttributionRelationError } from './store';
import type {
  FirstPartyAttributionReport,
  FirstPartyAttributedOrderRow,
  FirstPartyBreakdownRow,
} from './types';

function hasClickId(row: { gclid?: string | null; gbraid?: string | null; wbraid?: string | null }): boolean {
  return Boolean(row.gclid?.trim() || row.gbraid?.trim() || row.wbraid?.trim());
}

function emptyReport(): FirstPartyAttributionReport {
  return {
    googleAdsPaid: { count: 0, revenue: 0, aov: 0 },
    recentPaidOrders: [],
    byDestination: [],
    byCampaign: [],
  };
}

type PaidRow = {
  order_id: string;
  paid_at: string | null;
  grand_total: number | null;
  phone_country_code: string | null;
  delivery_destination: string | null;
  gclid: string | null;
  gbraid: string | null;
  wbraid: string | null;
  attribution_id: string | null;
  order_json: Record<string, unknown> | null;
};

export async function fetchFirstPartyAttributionReport(
  dateFrom: string,
  dateTo: string,
): Promise<FirstPartyAttributionReport> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return emptyReport();

  const paidQuery = supabase
    .from('orders')
    .select(
      'order_id, paid_at, grand_total, phone_country_code, delivery_destination, gclid, gbraid, wbraid, attribution_id, order_json',
    )
    .eq('payment_status', 'PAID')
    .gte('paid_at', `${dateFrom}T00:00:00.000Z`)
    .lte('paid_at', `${dateTo}T23:59:59.999Z`);

  const [recentRes, googleRes] = await Promise.all([
    paidQuery.order('paid_at', { ascending: false }).limit(50),
    supabase
      .from('orders')
      .select('order_id, paid_at, grand_total, delivery_destination, gclid, gbraid, wbraid, attribution_id')
      .eq('payment_status', 'PAID')
      .gte('paid_at', `${dateFrom}T00:00:00.000Z`)
      .lte('paid_at', `${dateTo}T23:59:59.999Z`)
      .or('gclid.not.is.null,gbraid.not.is.null,wbraid.not.is.null'),
  ]);

  if (recentRes.error) {
    if (isMissingAttributionRelationError(recentRes.error)) return emptyReport();
    console.error('[attribution] diagnostics paid orders failed:', recentRes.error.message);
    return emptyReport();
  }

  const orders = (recentRes.data ?? []) as PaidRow[];
  const googleRows = (googleRes.data ?? []) as PaidRow[];
  const attrIds = Array.from(
    new Set(
      orders.concat(googleRows)
        .map((o) => o.attribution_id)
        .filter((id): id is string => Boolean(id)),
    ),
  );

  const sessionsById = new Map<
    string,
    { source: string | null; utm_campaign: string | null; utm_source: string | null; utm_medium: string | null }
  >();
  if (attrIds.length > 0) {
    const { data: sessions, error: sessError } = await supabase
      .from('attribution_sessions')
      .select('id, source, utm_campaign, utm_source, utm_medium')
      .in('id', attrIds);
    if (!sessError && sessions) {
      for (const s of sessions as Array<{
        id: string;
        source: string | null;
        utm_campaign: string | null;
        utm_source: string | null;
        utm_medium: string | null;
      }>) {
        sessionsById.set(s.id, s);
      }
    }
  }

  const orderIds = orders.map((o) => o.order_id);
  const convByOrder = new Map<string, string>();
  if (orderIds.length > 0) {
    const { data: conv, error: convError } = await supabase
      .from('google_ads_offline_conversions')
      .select('order_id, status')
      .in('order_id', orderIds);
    if (!convError && conv) {
      for (const c of conv as Array<{ order_id: string; status: string }>) {
        convByOrder.set(c.order_id, c.status);
      }
    }
  }

  const destMap = new Map<string, FirstPartyBreakdownRow>();
  const campaignMap = new Map<string, FirstPartyBreakdownRow>();
  let googleCount = 0;
  let googleRevenue = 0;
  for (const row of googleRows) {
    if (!hasClickId(row)) continue;
    const revenue = Number(row.grand_total ?? 0);
    googleCount += 1;
    googleRevenue += Number.isFinite(revenue) ? revenue : 0;
    const destKey = row.delivery_destination?.trim() || 'unknown';
    const dest = destMap.get(destKey) ?? { key: destKey, count: 0, revenue: 0 };
    dest.count += 1;
    dest.revenue += Number.isFinite(revenue) ? revenue : 0;
    destMap.set(destKey, dest);
    const session = row.attribution_id ? sessionsById.get(row.attribution_id) : undefined;
    const campaign = session?.utm_campaign?.trim();
    if (campaign) {
      const camp = campaignMap.get(campaign) ?? { key: campaign, count: 0, revenue: 0 };
      camp.count += 1;
      camp.revenue += Number.isFinite(revenue) ? revenue : 0;
      campaignMap.set(campaign, camp);
    }
  }

  const recentPaidOrders: FirstPartyAttributedOrderRow[] = orders.map((row) => {
    const click = hasClickId(row);
    const revenue = Number(row.grand_total ?? 0);
    const session = row.attribution_id ? sessionsById.get(row.attribution_id) : undefined;
    const campaign = session?.utm_campaign?.trim() || null;
    const source = session?.source?.trim() || (click ? 'google' : null);
    const currency =
      (row.order_json && typeof row.order_json.currency === 'string' && row.order_json.currency.trim()) ||
      'THB';

    return {
      orderId: row.order_id,
      paidAt: row.paid_at,
      revenue: Number.isFinite(revenue) ? revenue : 0,
      currency,
      phoneCountryCode: row.phone_country_code,
      deliveryDestination: row.delivery_destination,
      source,
      googleAds: click,
      hasClickId: click,
      campaign,
      utmSource: session?.utm_source ?? null,
      utmMedium: session?.utm_medium ?? null,
      offlineConversionStatus: convByOrder.get(row.order_id) ?? null,
    };
  });

  return {
    googleAdsPaid: {
      count: googleCount,
      revenue: googleRevenue,
      aov: googleCount > 0 ? googleRevenue / googleCount : 0,
    },
    recentPaidOrders,
    byDestination: Array.from(destMap.values()).sort((a, b) => b.revenue - a.revenue),
    byCampaign: Array.from(campaignMap.values()).sort((a, b) => b.revenue - a.revenue),
  };
}
