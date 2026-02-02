/**
 * Order types and storage helpers for Smart Chat Link flow.
 * Uses data/orders.json (dev-friendly); for serverless consider DB or KV later.
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

const ORDERS_KV_KEY = 'lannabloom:orders';

/** Redis config from env: Upstash (UPSTASH_*) or Vercel KV (KV_REST_API_*). */
function getRedisConfig(): { url: string; token: string } | null {
  const url =
    process.env.UPSTASH_REDIS_REST_URL ||
    process.env.KV_REST_API_URL;
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    process.env.KV_REST_API_TOKEN;
  if (url && token) return { url, token };
  return null;
}

/** Use Redis (Upstash) when configured; else on Vercel use /tmp; locally use ./data/orders.json */
function useRedisStorage(): boolean {
  return getRedisConfig() !== null;
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
  const config = getRedisConfig();
  if (config) {
    try {
      const { Redis } = await import('@upstash/redis');
      const redis = new Redis(config);
      const raw = await redis.get(ORDERS_KV_KEY);
      if (raw == null) return [];
      const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
      return Array.isArray(data) ? data : [];
    } catch (e) {
      if (process.env.VERCEL) {
        console.error('[orders] Redis read failed, using file fallback:', e);
      }
      return readOrdersFromFile();
    }
  }
  return readOrdersFromFile();
}

async function writeOrders(orders: Order[]): Promise<void> {
  const config = getRedisConfig();
  if (config) {
    try {
      const { Redis } = await import('@upstash/redis');
      const redis = new Redis(config);
      await redis.set(ORDERS_KV_KEY, JSON.stringify(orders));
      return;
    } catch (e) {
      if (process.env.VERCEL) {
        console.error('[orders] Redis write failed:', e);
        throw e;
      }
      await writeOrdersToFile(orders);
      return;
    }
  }
  await writeOrdersToFile(orders);
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
    console.log('[orders] Created', orderId, useKvStorage() ? 'KV' : 'file/tmp');
  }
  return order;
}

/** Get order by orderId; null if not found. On Vercel KV, retries once after a short delay to handle replication lag. */
export async function getOrderById(orderId: string): Promise<Order | null> {
  const normalized = orderId.trim();
  let orders = await readOrders();
  let order = orders.find((o) => o.orderId === normalized) ?? null;
  if (!order && useRedisStorage() && process.env.VERCEL) {
    await new Promise((r) => setTimeout(r, 1500));
    orders = await readOrders();
    order = orders.find((o) => o.orderId === normalized) ?? null;
  }
  return order;
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
