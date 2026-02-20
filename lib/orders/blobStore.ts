/**
 * Blob store backend. Uses Vercel Blob when BLOB_READ_WRITE_TOKEN is set.
 */

import { promises as fs } from 'fs';
import path from 'path';
import type { Order, OrderPayload } from './types';

const ORDERS_BLOB_PATH = 'lannabloom/orders.json';

export function useBlobStorage(): boolean {
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
        console.error('[orders/blob] Blob pathname mismatch. Expected like', ORDERS_BLOB_PATH, 'Got:', blobs.map((b) => b.pathname));
      }
      if (process.env.VERCEL && blobs.length === 0 && attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, retryDelayMs));
        return readOrdersFromBlob(attempt + 1);
      }
      return [];
    }

    const res = await fetch(blob.url, { cache: 'no-store' });
    if (!res.ok) {
      if (process.env.VERCEL) console.error('[orders/blob] Blob fetch not ok:', res.status, blob.url);
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
        console.error('[orders/blob] Blob not found. Ensure BLOB_READ_WRITE_TOKEN is the SAME for Production and Preview.');
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
      console.error('[orders/blob] Blob read failed:', e);
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
      console.error('[orders/blob] Blob write failed:', e);
      throw e;
    }
    await writeOrdersToFile(orders);
  }
}

export function generateOrderId(): string {
  const year = new Date().getFullYear();
  const ts = Date.now().toString(36).slice(-4).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `LB-${year}-${ts}${rand}`;
}

export async function blobCreateOrder(payload: OrderPayload, status?: Order['status']): Promise<Order> {
  const orders = await readOrders();
  const orderId = generateOrderId();
  const order: Order = {
    ...payload,
    orderId,
    createdAt: new Date().toISOString(),
    ...(status ? { status } : {}),
  };
  orders.push(order);
  await writeOrders(orders);
  if (process.env.NODE_ENV === 'development') {
    console.log('[orders/blob] Created', orderId);
  } else if (process.env.VERCEL) {
    console.log('[orders/blob] Created', orderId, useBlobStorage() ? 'Blob' : 'file/tmp');
  }
  return order;
}

export async function blobUpdateOrderPaymentStatus(
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

export async function blobGetOrderByStripeSessionId(stripeSessionId: string): Promise<Order | null> {
  const orders = await readOrders();
  return orders.find((o) => o.stripeSessionId === stripeSessionId) ?? null;
}

export async function blobGetOrderById(orderId: string): Promise<Order | null> {
  const normalized = orderId.trim();
  const orders = await readOrders();
  return orders.find((o) => o.orderId === normalized) ?? null;
}

export async function blobDeleteOrder(orderId: string): Promise<boolean> {
  const orders = await readOrders();
  const normalized = orderId.trim();
  const filtered = orders.filter((o) => o.orderId !== normalized);
  if (filtered.length === orders.length) return false;
  await writeOrders(filtered);
  if (process.env.NODE_ENV === 'development') {
    console.log('[orders/blob] Deleted', normalized);
  }
  return true;
}

export async function blobListOrders(): Promise<Order[]> {
  const orders = await readOrders();
  return [...orders].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}
