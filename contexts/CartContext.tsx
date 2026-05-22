'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { BouquetSize } from '@/lib/bouquets';
import type { DeliveryDestinationId } from '@/lib/delivery/markets';
import type { AddOnsValues } from '@/components/AddOnsSection';
import {
  applyOrderGiftCardMessageToItems,
  clipOrderGiftCardMessage,
} from '@/lib/cart/orderGiftCardMessage';

const CART_STORAGE_KEY = 'lanna-bloom-cart';
const ORDER_GIFT_MESSAGE_KEY = 'lanna-bloom-order-gift-message';

export interface CartItem {
  /** 'bouquet' | 'product' | 'plushyToy' | 'balloon' — default 'bouquet' for backward compat */
  itemType?: 'bouquet' | 'product' | 'plushyToy' | 'balloon';
  /** Sanity document ID (bouquet or product) */
  bouquetId: string;
  slug: string;
  nameEn: string;
  nameTh: string;
  /** First image URL for cart thumbnail (optional, for items added before this field existed). */
  imageUrl?: string;
  size: BouquetSize;
  addOns: AddOnsValues;
  /** Number of units (default 1 for backward compat). */
  quantity?: number;
  /** When set on catalog lines, used to validate cart vs selected delivery destination. */
  excludedDeliveryDestinations?: DeliveryDestinationId[];
}

interface CartContextValue {
  items: CartItem[];
  /** Total number of units across all items. */
  count: number;
  /**
   * Increments every time `addItem()` is called.
   * Used for UI helpers that should re-run on each add.
   */
  lastAddEventId: number;
  addItem: (item: CartItem, quantity?: number) => void;
  updateItem: (index: number, item: CartItem) => void;
  removeItem: (index: number) => void;
  clearCart: () => void;
  /** Persisted draft when cart has no bouquet line yet (synced with PDP + checkout). */
  orderGiftCardMessageDraft: string;
  /** Set order-level gift card message on draft and all bouquet cart lines. */
  setOrderGiftCardMessage: (message: string) => void;
}

const CartContext = createContext<CartContextValue | null>(null);

function loadFromStorage(): CartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CartItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveToStorage(items: CartItem[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // ignore
  }
}

function loadGiftMessageDraft(): string {
  if (typeof window === 'undefined') return '';
  try {
    const raw = localStorage.getItem(ORDER_GIFT_MESSAGE_KEY);
    return typeof raw === 'string' ? clipOrderGiftCardMessage(raw) : '';
  } catch {
    return '';
  }
}

function saveGiftMessageDraft(message: string) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(ORDER_GIFT_MESSAGE_KEY, clipOrderGiftCardMessage(message));
  } catch {
    // ignore
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [orderGiftCardMessageDraft, setOrderGiftCardMessageDraft] = useState('');
  const [hydrated, setHydrated] = useState(false);
  const [lastAddEventId, setLastAddEventId] = useState(0);

  useEffect(() => {
    setItems(loadFromStorage());
    setOrderGiftCardMessageDraft(loadGiftMessageDraft());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveToStorage(items);
  }, [items, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    saveGiftMessageDraft(orderGiftCardMessageDraft);
  }, [orderGiftCardMessageDraft, hydrated]);

  const addItem = useCallback((item: CartItem, quantity: number = 1) => {
    const qty = Math.max(1, Math.floor(quantity));
    const itemWithQty = { ...item, quantity: item.quantity ?? 1 };

    // Trigger UI attention/toast helpers even when the cart line merges.
    setLastAddEventId((id) => id + 1);

    setItems((prev) => {
      const matchIndex = prev.findIndex(
        (p) =>
          p.bouquetId === item.bouquetId &&
          (p.itemType ?? 'bouquet') === (item.itemType ?? 'bouquet') &&
          p.size.optionId === item.size.optionId &&
          (p.addOns.cardMessage ?? '').trim() === (item.addOns.cardMessage ?? '').trim() &&
          (p.addOns.balloonText ?? '').trim() === (item.addOns.balloonText ?? '').trim() &&
          JSON.stringify(p.addOns.productAddOns ?? {}) ===
            JSON.stringify(item.addOns.productAddOns ?? {})
      );
      if (matchIndex >= 0) {
        const next = [...prev];
        const existing = next[matchIndex];
        next[matchIndex] = {
          ...existing,
          quantity: (existing.quantity ?? 1) + qty,
        };
        return next;
      }
      return [...prev, { ...itemWithQty, quantity: qty }];
    });
  }, []);

  const updateItem = useCallback((index: number, item: CartItem) => {
    setItems((prev) => {
      if (index < 0 || index >= prev.length) return prev;
      const next = [...prev];
      next[index] = item;
      return next;
    });
  }, []);

  const removeItem = useCallback((index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    setOrderGiftCardMessageDraft('');
  }, []);

  const setOrderGiftCardMessage = useCallback((message: string) => {
    const clipped = clipOrderGiftCardMessage(message);
    setOrderGiftCardMessageDraft(clipped);
    setItems((prev) => applyOrderGiftCardMessageToItems(prev, clipped));
  }, []);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      count: items.reduce((sum, i) => sum + (i.quantity ?? 1), 0),
      lastAddEventId,
      addItem,
      updateItem,
      removeItem,
      clearCart,
      orderGiftCardMessageDraft,
      setOrderGiftCardMessage,
    }),
    [
      items,
      lastAddEventId,
      addItem,
      updateItem,
      removeItem,
      clearCart,
      orderGiftCardMessageDraft,
      setOrderGiftCardMessage,
    ]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error('useCart must be used within CartProvider');
  }
  return ctx;
}
