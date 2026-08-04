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
  GIFT_CARD_MESSAGES_MAX_COUNT,
  clearItemCardMessages,
  clipGiftCardMessage,
  normalizeGiftCardMessagesForUi,
} from '@/lib/cart/orderGiftCardMessage';

const CART_STORAGE_KEY = 'lanna-bloom-cart';
const ORDER_GIFT_MESSAGE_KEY = 'lanna-bloom-order-gift-message';

function isLegacySanityImageUrl(url: string | undefined): boolean {
  const raw = (url ?? '').trim();
  if (!raw) return false;
  return raw.includes('cdn.sanity.io') || raw.includes('sanity.io');
}

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
  /**
   * Catalog delivery_options at add time (same_day / next_day facets).
   * Missing → treated as same-day capable for legacy carts.
   */
  deliveryOptions?: string[];
  /**
   * Catalog discount_percent at add time (client eligibility for exclusive coupons).
   * Server recomputes from catalog — never trust this for money.
   */
  catalogDiscountPercent?: number;
}

interface CartContextValue {
  items: CartItem[];
  /** True after localStorage cart has been read on the client. */
  hydrated: boolean;
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
  /** Replace all cart lines atomically (e.g. shared cart import). */
  replaceItems: (items: CartItem[]) => void;
  /** Order-level gift card message drafts (always ≥1 slot; max 3). */
  orderGiftCardMessages: string[];
  /** Replace the full gift-card message list (normalized to 1–3 slots). */
  setOrderGiftCardMessages: (messages: string[]) => void;
  /** Update a single slot by index. */
  setOrderGiftCardMessageAt: (index: number, message: string) => void;
  /** Append an empty card slot when under the max. */
  addOrderGiftCardMessage: () => void;
  /** Remove a slot (keeps at least one empty field). */
  removeOrderGiftCardMessage: (index: number) => void;
}

const CartContext = createContext<CartContextValue | null>(null);

function loadFromStorage(): CartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CartItem[];
    if (!Array.isArray(parsed)) return [];
    // Drop legacy per-item card messages; gift text lives on orderGiftCardMessages.
    return clearItemCardMessages(
      parsed.map((item) => ({
        ...item,
        imageUrl: isLegacySanityImageUrl(item.imageUrl) ? undefined : item.imageUrl,
      }))
    );
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

function loadGiftMessagesDraft(): string[] {
  if (typeof window === 'undefined') return [''];
  try {
    const raw = localStorage.getItem(ORDER_GIFT_MESSAGE_KEY);
    if (raw == null) return [''];
    // Legacy: plain string. New: JSON string[].
    if (raw.startsWith('[')) {
      try {
        return normalizeGiftCardMessagesForUi(JSON.parse(raw));
      } catch {
        return normalizeGiftCardMessagesForUi(raw);
      }
    }
    return normalizeGiftCardMessagesForUi(raw);
  } catch {
    return [''];
  }
}

function saveGiftMessagesDraft(messages: string[]) {
  if (typeof window === 'undefined') return;
  try {
    const normalized = normalizeGiftCardMessagesForUi(messages);
    localStorage.setItem(ORDER_GIFT_MESSAGE_KEY, JSON.stringify(normalized));
  } catch {
    // ignore
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [orderGiftCardMessages, setOrderGiftCardMessagesState] = useState<string[]>(['']);
  const [hydrated, setHydrated] = useState(false);
  const [lastAddEventId, setLastAddEventId] = useState(0);

  useEffect(() => {
    setItems(loadFromStorage());
    setOrderGiftCardMessagesState(loadGiftMessagesDraft());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveToStorage(items);
  }, [items, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    saveGiftMessagesDraft(orderGiftCardMessages);
  }, [orderGiftCardMessages, hydrated]);

  const addItem = useCallback((item: CartItem, quantity: number = 1) => {
    const qty = Math.max(1, Math.floor(quantity));
    // Never stamp order gift messages onto cart lines.
    const itemWithQty = {
      ...item,
      quantity: item.quantity ?? 1,
      addOns: { ...item.addOns, cardMessage: '' },
    };

    // Trigger UI attention/toast helpers even when the cart line merges.
    setLastAddEventId((id) => id + 1);

    setItems((prev) => {
      const matchIndex = prev.findIndex(
        (p) =>
          p.bouquetId === item.bouquetId &&
          (p.itemType ?? 'bouquet') === (item.itemType ?? 'bouquet') &&
          p.size.optionId === item.size.optionId &&
          (p.addOns.balloonText ?? '').trim() === (item.addOns.balloonText ?? '').trim() &&
          (p.addOns.paperColor ?? null) === (item.addOns.paperColor ?? null) &&
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
      next[index] = {
        ...item,
        addOns: { ...item.addOns, cardMessage: '' },
      };
      return next;
    });
  }, []);

  const removeItem = useCallback((index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    setOrderGiftCardMessagesState(['']);
  }, []);

  const replaceItems = useCallback((nextItems: CartItem[]) => {
    setItems(clearItemCardMessages(nextItems));
  }, []);

  const setOrderGiftCardMessages = useCallback((messages: string[]) => {
    setOrderGiftCardMessagesState(normalizeGiftCardMessagesForUi(messages));
  }, []);

  const setOrderGiftCardMessageAt = useCallback((index: number, message: string) => {
    setOrderGiftCardMessagesState((prev) => {
      const next = normalizeGiftCardMessagesForUi(prev);
      if (index < 0 || index >= next.length) return next;
      next[index] = clipGiftCardMessage(message);
      return [...next];
    });
  }, []);

  const addOrderGiftCardMessage = useCallback(() => {
    setOrderGiftCardMessagesState((prev) => {
      const next = normalizeGiftCardMessagesForUi(prev);
      if (next.length >= GIFT_CARD_MESSAGES_MAX_COUNT) return next;
      return [...next, ''];
    });
  }, []);

  const removeOrderGiftCardMessage = useCallback((index: number) => {
    setOrderGiftCardMessagesState((prev) => {
      const next = normalizeGiftCardMessagesForUi(prev);
      if (next.length <= 1) return [''];
      if (index < 0 || index >= next.length) return next;
      return next.filter((_, i) => i !== index);
    });
  }, []);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      hydrated,
      count: items.reduce((sum, i) => sum + (i.quantity ?? 1), 0),
      lastAddEventId,
      addItem,
      updateItem,
      removeItem,
      clearCart,
      replaceItems,
      orderGiftCardMessages,
      setOrderGiftCardMessages,
      setOrderGiftCardMessageAt,
      addOrderGiftCardMessage,
      removeOrderGiftCardMessage,
    }),
    [
      items,
      hydrated,
      lastAddEventId,
      addItem,
      updateItem,
      removeItem,
      clearCart,
      replaceItems,
      orderGiftCardMessages,
      setOrderGiftCardMessages,
      setOrderGiftCardMessageAt,
      addOrderGiftCardMessage,
      removeOrderGiftCardMessage,
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
