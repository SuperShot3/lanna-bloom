/**
 * Payment availability model for checkout sticky bar.
 * Determines which payment methods are enabled and why others might be disabled.
 */

export type PaymentAvailability = {
  enabled: boolean;
  reason?: string;
  actionHint?: string;
};

export type PaymentMethodsAvailability = {
  stripe: PaymentAvailability;
  bankTransfer: PaymentAvailability;
};

export type CheckoutState = {
  hasDeliveryDistrict: boolean;
  isFormValid: boolean;
  isLoading: boolean;
  firstIncompleteHint?: string;
  /** Optional localized messages (overrides default English) */
  messages?: {
    selectDeliveryArea?: string;
    processing?: string;
  };
};

/**
 * Returns availability for each payment method based on checkout state.
 * Priority of messages (most actionable first):
 * 1. No delivery area → "Select a delivery area to see payment options"
 * 2. Form incomplete → firstIncompleteHint (e.g. "Address is missing")
 * 3. Loading → both disabled
 * 4. All valid → both enabled
 */
export function getPaymentAvailability(
  state: CheckoutState
): PaymentMethodsAvailability {
  const { hasDeliveryDistrict, isFormValid, isLoading, firstIncompleteHint, messages } =
    state;

  const selectDeliveryArea = messages?.selectDeliveryArea ?? 'Select a delivery area to see payment options';
  const processing = messages?.processing ?? 'Processing...';

  if (isLoading) {
    return {
      stripe: { enabled: false, reason: processing },
      bankTransfer: { enabled: false, reason: processing },
    };
  }

  if (!hasDeliveryDistrict) {
    return {
      stripe: { enabled: false, reason: selectDeliveryArea, actionHint: 'Choose district first' },
      bankTransfer: { enabled: false, reason: selectDeliveryArea, actionHint: 'Choose district first' },
    };
  }

  if (!isFormValid && firstIncompleteHint) {
    return {
      stripe: { enabled: false, reason: firstIncompleteHint, actionHint: 'Complete required fields' },
      bankTransfer: { enabled: false, reason: firstIncompleteHint, actionHint: 'Complete required fields' },
    };
  }

  return {
    stripe: { enabled: true },
    bankTransfer: { enabled: true },
  };
}

/**
 * Derived: can user proceed to checkout (at least one payment enabled + form valid + not loading)?
 */
export function canCheckout(availability: PaymentMethodsAvailability): boolean {
  return (
    (availability.stripe.enabled || availability.bankTransfer.enabled) &&
    !availability.stripe.reason?.includes('Processing')
  );
}
