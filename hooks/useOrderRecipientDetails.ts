'use client';

import { useCart } from '@/contexts/CartContext';

/** Single source of truth for recipient name/phone (PDP ↔ cart, order-level). */
export function useOrderRecipientDetails() {
  const {
    orderRecipientName,
    orderRecipientCountryCode,
    orderRecipientPhoneNational,
    setOrderRecipientName,
    setOrderRecipientCountryCode,
    setOrderRecipientPhoneNational,
  } = useCart();

  return {
    recipientName: orderRecipientName,
    setRecipientName: setOrderRecipientName,
    recipientCountryCode: orderRecipientCountryCode,
    setRecipientCountryCode: setOrderRecipientCountryCode,
    recipientPhoneNational: orderRecipientPhoneNational,
    setRecipientPhoneNational: setOrderRecipientPhoneNational,
  };
}
