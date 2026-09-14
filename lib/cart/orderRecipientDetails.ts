import { clipCheckoutField } from '@/lib/checkout/checkoutFieldLimits';

export const DEFAULT_RECIPIENT_COUNTRY_CODE = '66';

export type OrderRecipientDetailsDraft = {
  recipientName: string;
  recipientCountryCode: string;
  recipientPhoneNational: string;
};

export const DEFAULT_ORDER_RECIPIENT_DETAILS: OrderRecipientDetailsDraft = {
  recipientName: '',
  recipientCountryCode: DEFAULT_RECIPIENT_COUNTRY_CODE,
  recipientPhoneNational: '',
};

export function clipRecipientName(value: string): string {
  return clipCheckoutField(value, 'recipientName');
}

export function clipRecipientPhoneNational(value: string): string {
  return clipCheckoutField(value.replace(/\D/g, ''), 'recipientPhoneNational');
}

/** Defensive parse for localStorage drafts (PDP ↔ cart shared order-level recipient info). */
export function normalizeOrderRecipientDetailsForUi(raw: unknown): OrderRecipientDetailsDraft {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_ORDER_RECIPIENT_DETAILS };
  const o = raw as Record<string, unknown>;
  return {
    recipientName: clipRecipientName(typeof o.recipientName === 'string' ? o.recipientName : ''),
    recipientCountryCode:
      typeof o.recipientCountryCode === 'string' && o.recipientCountryCode.trim()
        ? o.recipientCountryCode.trim()
        : DEFAULT_RECIPIENT_COUNTRY_CODE,
    recipientPhoneNational: clipRecipientPhoneNational(
      typeof o.recipientPhoneNational === 'string' ? o.recipientPhoneNational : ''
    ),
  };
}
