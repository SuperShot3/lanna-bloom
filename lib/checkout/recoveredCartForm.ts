import type { DeliveryFormValues } from '@/components/DeliveryForm';
import type { ContactPreferenceOption } from '@/lib/orders';

/** Cart form shape restored from a checkout abandonment snapshot. */
export type RecoveredCartForm = {
  delivery: DeliveryFormValues;
  customerName: string;
  customerEmail: string;
  countryCode: string;
  phoneNational: string;
  recipientName: string;
  recipientCountryCode: string;
  recipientPhoneNational: string;
  contactPreference: ContactPreferenceOption[];
  lineId?: string;
  isOrderingForSomeoneElse?: boolean;
  surpriseDelivery?: boolean;
  marketingEmailConsent?: boolean;
  checkoutRecoveryEmailConsent?: boolean;
  deliveryNotes?: string;
};
