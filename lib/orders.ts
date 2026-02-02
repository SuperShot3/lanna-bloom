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
}

export interface OrderDelivery {
  address: string;
  district?: string;
  preferredTimeSlot: string;
  notes?: string;
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
  items: OrderItem[];
  delivery: OrderDelivery;
  pricing: OrderPricing;
  /** Preferred ways to contact the customer (can select multiple). */
  contactPreference?: ContactPreferenceOption[];
}

export interface Order extends OrderPayload {
  orderId: string;
  createdAt: string;
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

async function readOrders(): Promise<Order[]> {
  if (!useBlobStorage()) {
    return readOrdersFromFile();
  }
  try {
    const { list } = await import('@vercel/blob');
    const { blobs } = await list({ prefix: 'lannabloom/' });
    const normalizedPath = ORDERS_BLOB_PATH.replace(/^\/+/, '');
    const blob = blobs.find(
      (b) =>
        b.pathname === ORDERS_BLOB_PATH ||
        b.pathname === normalizedPath ||
        b.pathname?.endsWith('orders.json')
    );
    if (!blob?.url) {
      if (process.env.VERCEL && blobs.length > 0) {
        console.error('[orders] Blob list pathname mismatch. Expected:', ORDERS_BLOB_PATH, 'Got:', blobs.map((b) => b.pathname));
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
    if (process.env.VERCEL) {
      console.error('[orders] Blob read failed (do NOT use file on Vercel - /tmp is per-instance):', e);
    }
    if (process.env.VERCEL) {
      return [];
    }
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
  if (process.env.NODE_ENV === 'development') {
    console.log('[orders] Created', orderId, payload.delivery?.district ?? '');
  } else if (process.env.VERCEL) {
    console.log('[orders] Created', orderId, useBlobStorage() ? 'Blob' : 'file/tmp');
  }
  return order;
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

/** Base URL for public links (order details page). */
export function getBaseUrl(): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl) return appUrl.replace(/\/$/, '');
  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) return `https://${vercelUrl}`;
  return 'http://localhost:3000';
}

export function getOrderDetailsUrl(orderId: string): string {
  return `${getBaseUrl()}/order/${encodeURIComponent(orderId)}`;
}
