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

const DATA_DIR = path.join(process.cwd(), 'data');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');

async function ensureDataDir(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function readOrders(): Promise<Order[]> {
  await ensureDataDir();
  try {
    const raw = await fs.readFile(ORDERS_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeOrders(orders: Order[]): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(ORDERS_FILE, JSON.stringify(orders, null, 2), 'utf-8');
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
  }
  return order;
}

/** Get order by orderId; null if not found. */
export async function getOrderById(orderId: string): Promise<Order | null> {
  const orders = await readOrders();
  const normalized = orderId.trim();
  return orders.find((o) => o.orderId === normalized) ?? null;
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
