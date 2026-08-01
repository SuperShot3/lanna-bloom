'use client';

import { useCallback, useMemo } from 'react';
import { useCart } from '@/contexts/CartContext';
import {
  GIFT_CARD_MESSAGES_MAX_COUNT,
  normalizeGiftCardMessagesForUi,
} from '@/lib/cart/orderGiftCardMessage';

/** Single source of truth for gift/card messages (PDP ↔ cart ↔ checkout). */
export function useOrderGiftCardMessage() {
  const {
    orderGiftCardMessages,
    setOrderGiftCardMessages,
    setOrderGiftCardMessageAt,
    addOrderGiftCardMessage,
    removeOrderGiftCardMessage,
  } = useCart();

  const giftCardMessages = useMemo(
    () => normalizeGiftCardMessagesForUi(orderGiftCardMessages),
    [orderGiftCardMessages]
  );

  /** First message — convenience for simple single-field call sites. */
  const giftCardMessage = giftCardMessages[0] ?? '';

  const setGiftCardMessage = useCallback(
    (message: string) => setOrderGiftCardMessageAt(0, message),
    [setOrderGiftCardMessageAt]
  );

  const setGiftCardMessages = useCallback(
    (messages: string[]) => setOrderGiftCardMessages(messages),
    [setOrderGiftCardMessages]
  );

  const canAddGiftCard = giftCardMessages.length < GIFT_CARD_MESSAGES_MAX_COUNT;

  return {
    giftCardMessage,
    giftCardMessages,
    setGiftCardMessage,
    setGiftCardMessages,
    setGiftCardMessageAt: setOrderGiftCardMessageAt,
    addGiftCardMessage: addOrderGiftCardMessage,
    removeGiftCardMessage: removeOrderGiftCardMessage,
    canAddGiftCard,
    maxGiftCards: GIFT_CARD_MESSAGES_MAX_COUNT,
  };
}
