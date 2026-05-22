'use client';

import { useCallback, useMemo } from 'react';
import { useCart } from '@/contexts/CartContext';
import { readOrderGiftCardMessage } from '@/lib/cart/orderGiftCardMessage';

/** Single source of truth for gift/card message (PDP ↔ cart ↔ checkout). */
export function useOrderGiftCardMessage() {
  const { items, orderGiftCardMessageDraft, setOrderGiftCardMessage } = useCart();

  const giftCardMessage = useMemo(
    () => readOrderGiftCardMessage(items, orderGiftCardMessageDraft),
    [items, orderGiftCardMessageDraft]
  );

  const setGiftCardMessage = useCallback(
    (message: string) => setOrderGiftCardMessage(message),
    [setOrderGiftCardMessage]
  );

  return { giftCardMessage, setGiftCardMessage };
}
