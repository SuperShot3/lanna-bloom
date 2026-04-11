/**
 * GA4 Measurement Protocol — server-side `purchase` only (revenue).
 * Triggered when an order becomes PAID (Stripe fulfillment, sync, admin mark-paid, etc.).
 *
 * Env: GA4_MEASUREMENT_ID, GA4_MEASUREMENT_API_SECRET, GA4_MP_DEBUG (true = use debug endpoint).
 */

import 'server-only';

const CURRENCY = 'THB';

function getConfig(): {
  measurementId: string;
  apiSecret: string;
  useDebug: boolean;
} | null {
  const measurementId = process.env.GA4_MEASUREMENT_ID?.trim();
  const apiSecret = process.env.GA4_MEASUREMENT_API_SECRET?.trim();
  if (!measurementId || !apiSecret) return null;
  const useDebug = process.env.GA4_MP_DEBUG === 'true';
  return { measurementId, apiSecret, useDebug };
}

export interface PurchaseItemPayload {
  item_id: string;
  item_name: string;
  price: number;
  quantity?: number;
  index?: number;
  item_variant?: string;
  currency?: string;
}

export interface SendPurchaseParams {
  transactionId: string;
  value: number;
  currency?: string;
  items: PurchaseItemPayload[];
  /** If stored for the order, reuse for attribution. Otherwise a server-generated id is used. */
  clientId?: string | null;
}

/**
 * Send a single purchase event to GA4 via Measurement Protocol.
 * Uses production endpoint unless GA4_MP_DEBUG=true (then uses debug endpoint).
 */
export async function sendPurchaseToGA4(params: SendPurchaseParams): Promise<{
  ok: boolean;
  statusCode?: number;
  validationMessages?: unknown;
  error?: string;
}> {
  const config = getConfig();
  if (!config) {
    console.warn('[ga4/mp] GA4 Measurement Protocol not configured (missing GA4_MEASUREMENT_ID or GA4_MEASUREMENT_API_SECRET)');
    return { ok: false, error: 'GA4 not configured' };
  }

  const { measurementId, apiSecret, useDebug } = config;
  const baseUrl = useDebug
    ? 'https://www.google-analytics.com/debug/mp/collect'
    : 'https://www.google-analytics.com/mp/collect';

  const url = `${baseUrl}?measurement_id=${encodeURIComponent(measurementId)}&api_secret=${encodeURIComponent(apiSecret)}`;

  const currency = params.currency ?? CURRENCY;
  const items = params.items.map((it, i) => ({
    item_id: it.item_id,
    item_name: it.item_name,
    price: it.price,
    quantity: it.quantity ?? 1,
    index: it.index ?? i,
    ...(it.item_variant != null && { item_variant: it.item_variant }),
    currency: it.currency ?? currency,
  }));

  const clientId = (params.clientId && String(params.clientId).trim()) || `server-${params.transactionId}`;

  const body = {
    client_id: clientId,
    events: [
      {
        name: 'purchase',
        params: {
          transaction_id: params.transactionId,
          value: params.value,
          currency,
          items,
        },
      },
    ],
  };

  console.log('[ga4/mp] purchase payload prepared', {
    transaction_id: params.transactionId,
    value: params.value,
    currency,
    itemsCount: items.length,
    endpoint: useDebug ? 'debug' : 'production',
  });

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const text = await res.text();
    let validationMessages: unknown;
    try {
      validationMessages = text ? JSON.parse(text) : undefined;
    } catch {
      validationMessages = text;
    }

    if (useDebug) {
      console.log('[ga4/mp] GA4 debug response', { status: res.status, body: validationMessages });
    }

    if (!res.ok) {
      console.error('[ga4/mp] GA4 request failed', {
        status: res.status,
        response: validationMessages,
      });
      return {
        ok: false,
        statusCode: res.status,
        validationMessages,
        error: `GA4 MP returned ${res.status}`,
      };
    }

    console.log('[ga4/mp] purchase sent successfully', {
      transaction_id: params.transactionId,
      endpoint: useDebug ? 'debug' : 'production',
    });
    return { ok: true, statusCode: res.status, validationMessages };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[ga4/mp] GA4 request error', { error: msg, transaction_id: params.transactionId });
    return { ok: false, error: msg };
  }
}
