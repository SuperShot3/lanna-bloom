/**
 * Order types and storage helpers for Smart Chat Link flow.
 * Uses Vercel Blob when BLOB_READ_WRITE_TOKEN is set; else data/orders.json (local) or /tmp (Vercel without Blob).
 */

import { promises as fs } from 'fs';
import path from 'path';

/** Add-on card type for API (free | premium maps to beautiful). */
export type OrderCardType = 'free' | 'premium' | null;

/** Wrapping option for API (standard = classic, premium = premium, no paper = none). */
export type OrderWrappingOption = 'standard' | 'premium' | 'no paper' | null;

export interface OrderItemAddOns {
  cardType: OrderCardType;
  cardMessage: string;
  wrappingOption: OrderWrappingOption;
}

export interface OrderItem {
  bouquetId: string;
  bouquetTitle: string;
  size: string;
  price: number;
  addOns: OrderItemAddOns;
  /** Chosen reference image URL (cart/order flow). */
  imageUrl?: string;
  /** Bouquet slug for product page URL (Share flower button). */
  bouquetSlug?: string;
}

/** District key for delivery fee calculation. */
export type DeliveryDistrictKey =
  | 'MUEANG' | 'SARAPHI' | 'SAN_SAI' | 'HANG_DONG' | 'SAN_KAMPHAENG'
  | 'MAE_RIM' | 'DOI_SAKET' | 'MAE_ON' | 'SAMOENG' | 'MAE_TAENG' | 'UNKNOWN';

export interface OrderDelivery {
  address: string;
  /** @deprecated Kept for backward compatibility with existing orders. */
  district?: string;
  preferredTimeSlot: string;
  recipientName?: string;
  recipientPhone?: string;
  notes?: string;
  /** Delivery pin (map picker). */
  deliveryLat?: number;
  deliveryLng?: number;
  deliveryGoogleMapsUrl?: string;
  /** District for fee calculation. Required for new orders. */
  deliveryDistrict?: DeliveryDistrictKey;
  /** Central Chiang Mai (Old City / Nimman / etc). Only when deliveryDistrict is MUEANG. */
  isMueangCentral?: boolean;
}

export interface OrderPricing {
  itemsTotal: number;
  deliveryFee: number;
  grandTotal: number;
}

export type ContactPreferenceOption = 'phone' | 'line' | 'telegram' | 'whatsapp';

export interface OrderPayload {
  customerName?: string;
  phone?: string;
  /** Customer email for order confirmation notifications. */
  customerEmail?: string;
  items: OrderItem[];
  delivery: OrderDelivery;
  pricing: OrderPricing;
  /** Preferred ways to contact the customer (can select multiple). */
  contactPreference?: ContactPreferenceOption[];
  /** Referral code from ?ref= (MVP, client-stored). */
  referralCode?: string;
  /** Referral discount amount in THB (e.g. 100). */
  referralDiscount?: number;
}

/** Order payment status. Legacy orders (bank transfer) have no status or 'paid'. */
export type OrderPaymentStatus = 'pending_payment' | 'paid' | 'payment_failed';

export interface Order extends OrderPayload {
  orderId: string;
  createdAt: string;
  /** Payment status. Omitted for legacy bank-transfer orders (treated as paid). */
  status?: OrderPaymentStatus;
  /** Stripe payment identifiers. Set when webhook marks order paid. */
  stripeSessionId?: string;
  paymentIntentId?: string;
  amountTotal?: number;
  currency?: string;
  paidAt?: string;
}

/** Blob path for the single JSON file holding all orders. */
const ORDERS_BLOB_PATH = 'lannabloom/orders.json';

/** Use Vercel Blob when BLOB_READ_WRITE_TOKEN is set; else file or /tmp. */
function useBlobStorage(): boolean {
  return !!process.env.BLOB_READ_WRITE_TOKEN;
}

function getOrdersFilePath(): string {
  if (process.env.VERCEL) {
    return path.join(process.env.TMPDIR || '/tmp', 'lannabloom-orders.json');
  }
  return path.join(process.cwd(), 'data', 'orders.json');
}

async function ensureDataDir(): Promise<void> {
  if (process.env.VERCEL) return;
  const dataDir = path.join(process.cwd(), 'data');
  await fs.mkdir(dataDir, { recursive: true });
}

async function readOrdersFromFile(): Promise<Order[]> {
  const ordersFile = getOrdersFilePath();
  await ensureDataDir();
  try {
    const raw = await fs.readFile(ordersFile, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeOrdersToFile(orders: Order[]): Promise<void> {
  const ordersFile = getOrdersFilePath();
  await ensureDataDir();
  await fs.writeFile(ordersFile, JSON.stringify(orders, null, 2), 'utf-8');
}

function findOrdersBlob(blobs: { pathname: string; url: string }[]): { pathname: string; url: string } | undefined {
  const normalizedPath = ORDERS_BLOB_PATH.replace(/^\/+/, '');
  return blobs.find(
    (b) =>
      b.pathname === ORDERS_BLOB_PATH ||
      b.pathname === normalizedPath ||
      b.pathname?.endsWith('orders.json')
  );
}

async function readOrdersFromBlob(attempt = 0): Promise<Order[]> {
  const { list } = await import('@vercel/blob');
  const maxRetries = process.env.VERCEL ? 3 : 0;
  const retryDelayMs = 1200;

  try {
    const { blobs } = await list({ prefix: 'lannabloom/', limit: 100 });
    const blob = findOrdersBlob(blobs);

    if (!blob?.url) {
      if (process.env.VERCEL && blobs.length > 0) {
        console.error('[orders] Blob pathname mismatch. Expected like', ORDERS_BLOB_PATH, 'Got:', blobs.map((b) => b.pathname));
      }
      if (process.env.VERCEL && blobs.length === 0 && attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, retryDelayMs));
        return readOrdersFromBlob(attempt + 1);
      }
      return [];
    }

    const res = await fetch(blob.url, { cache: 'no-store' });
    if (!res.ok) {
      if (process.env.VERCEL) console.error('[orders] Blob fetch not ok:', res.status, blob.url);
      return [];
    }
    const raw = await res.text();
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch (e) {
    const isNotFound = e && typeof e === 'object' && 'message' in e && String((e as Error).message).includes('does not exist');
    if (isNotFound || (e as Error).constructor?.name === 'BlobNotFoundError') {
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, retryDelayMs));
        return readOrdersFromBlob(attempt + 1);
      }
      if (process.env.VERCEL) {
        console.error(
          '[orders] Blob not found. Ensure BLOB_READ_WRITE_TOKEN is the SAME for Production and Preview (Vercel → Storage → your store → envs).'
        );
      }
      return [];
    }
    throw e;
  }
}

async function readOrders(): Promise<Order[]> {
  if (!useBlobStorage()) {
    return readOrdersFromFile();
  }
  try {
    return await readOrdersFromBlob();
  } catch (e) {
    if (process.env.VERCEL) {
      console.error('[orders] Blob read failed:', e);
    }
    if (process.env.VERCEL) return [];
    return readOrdersFromFile();
  }
}

async function writeOrders(orders: Order[]): Promise<void> {
  if (!useBlobStorage()) {
    await writeOrdersToFile(orders);
    return;
  }
  try {
    const { put } = await import('@vercel/blob');
    await put(ORDERS_BLOB_PATH, JSON.stringify(orders), {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
    });
  } catch (e) {
    if (process.env.VERCEL) {
      console.error('[orders] Blob write failed:', e);
      throw e;
    }
    await writeOrdersToFile(orders);
  }
}

/** Generate orderId: LB-YYYY-###### (timestamp + random suffix for collision safety). */
export function generateOrderId(): string {
  const year = new Date().getFullYear();
  const ts = Date.now().toString(36).slice(-4).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `LB-${year}-${ts}${rand}`;
}

/** Create order, append to storage, return order with orderId. */
export async function createOrder(payload: OrderPayload): Promise<Order> {
  const orders = await readOrders();
  const orderId = generateOrderId();
  const order: Order = {
    ...payload,
    orderId,
    createdAt: new Date().toISOString(),
  };
  orders.push(order);
  await writeOrders(orders);
  void import('@/lib/supabase/orderAdapter').then(({ dualWriteOrder }) =>
    dualWriteOrder(order).catch(() => {})
  );
  if (process.env.NODE_ENV === 'development') {
    console.log('[orders] Created', orderId);
  } else if (process.env.VERCEL) {
    console.log('[orders] Created', orderId, useBlobStorage() ? 'Blob' : 'file/tmp');
  }
  return order;
}

/** Create pending order for Stripe flow. Status is pending_payment. */
export async function createPendingOrder(payload: OrderPayload): Promise<Order> {
  const orders = await readOrders();
  const orderId = generateOrderId();
  const order: Order = {
    ...payload,
    orderId,
    createdAt: new Date().toISOString(),
    status: 'pending_payment',
  };
  orders.push(order);
  await writeOrders(orders);
  void import('@/lib/supabase/orderAdapter').then(({ dualWriteOrder }) =>
    dualWriteOrder(order).catch(() => {})
  );
  if (process.env.NODE_ENV === 'development') {
    console.log('[orders] Created pending', orderId);
  }
  return order;
}

/** Update order payment status. Used by Stripe webhook. */
export async function updateOrderPaymentStatus(
  orderId: string,
  update: {
    status: 'paid' | 'payment_failed';
    stripeSessionId?: string;
    paymentIntentId?: string;
    amountTotal?: number;
    currency?: string;
    paidAt?: string;
  }
): Promise<Order | null> {
  const orders = await readOrders();
  const normalized = orderId.trim();
  const idx = orders.findIndex((o) => o.orderId === normalized);
  if (idx < 0) return null;
  const order = orders[idx];
  orders[idx] = {
    ...order,
    status: update.status,
    stripeSessionId: update.stripeSessionId ?? order.stripeSessionId,
    paymentIntentId: update.paymentIntentId ?? order.paymentIntentId,
    amountTotal: update.amountTotal ?? order.amountTotal,
    currency: update.currency ?? order.currency,
    paidAt: update.paidAt ?? order.paidAt,
  };
  await writeOrders(orders);
  return orders[idx];
}

/** Get order by Stripe session ID. Used for webhook idempotency. */
export async function getOrderByStripeSessionId(stripeSessionId: string): Promise<Order | null> {
  const orders = await readOrders();
  return orders.find((o) => o.stripeSessionId === stripeSessionId) ?? null;
}

/** Get order by orderId; null if not found. */
export async function getOrderById(orderId: string): Promise<Order | null> {
  const normalized = orderId.trim();
  const orders = await readOrders();
  return orders.find((o) => o.orderId === normalized) ?? null;
}

/** Remove order by orderId (e.g. after delivery). Returns true if removed, false if not found. */
export async function deleteOrder(orderId: string): Promise<boolean> {
  const orders = await readOrders();
  const normalized = orderId.trim();
  const filtered = orders.filter((o) => o.orderId !== normalized);
  if (filtered.length === orders.length) return false;
  await writeOrders(filtered);
  if (process.env.NODE_ENV === 'development') {
    console.log('[orders] Deleted', normalized);
  }
  return true;
}

/** List all orders (newest first). */
export async function listOrders(): Promise<Order[]> {
  const orders = await readOrders();
  return [...orders].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

/** Base URL for public links (order details page). Never returns localhost when running on Vercel. */
export function getBaseUrl(): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  const isLocalhost = (url: string) => /^https?:\/\/localhost(\d*)(\s|$|\/)/i.test(url) || /^https?:\/\/127\.0\.0\.1/i.test(url);
  if (appUrl && !isLocalhost(appUrl)) return appUrl.replace(/\/$/, '');
  if (process.env.VERCEL && process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return 'http://localhost:3000';
}

export function getOrderDetailsUrl(orderId: string): string {
  return `${getBaseUrl()}/order/${encodeURIComponent(orderId)}`;
}
