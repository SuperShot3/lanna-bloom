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
import type { AddOnsValues } from '@/components/AddOnsSection';

const CART_STORAGE_KEY = 'lanna-bloom-cart';

export interface CartItem {
  /** 'bouquet' | 'product' — default 'bouquet' for backward compat */
  itemType?: 'bouquet' | 'product';
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
}

interface CartContextValue {
  items: CartItem[];
  /** Total number of units across all items. */
  count: number;
  addItem: (item: CartItem, quantity?: number) => void;
  removeItem: (index: number) => void;
  clearCart: () => void;
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

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setItems(loadFromStorage());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveToStorage(items);
  }, [items, hydrated]);

  const addItem = useCallback((item: CartItem, quantity: number = 1) => {
    const qty = Math.max(1, Math.floor(quantity));
    const itemWithQty = { ...item, quantity: item.quantity ?? 1 };
    setItems((prev) => {
      const matchIndex = prev.findIndex(
        (p) =>
          p.bouquetId === item.bouquetId &&
          p.size.key === item.size.key &&
          (p.addOns.cardMessage ?? '').trim() === (item.addOns.cardMessage ?? '').trim() &&
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

  const removeItem = useCallback((index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      count: items.reduce((sum, i) => sum + (i.quantity ?? 1), 0),
      addItem,
      removeItem,
      clearCart,
    }),
    [items, addItem, removeItem, clearCart]
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
