/**
 * Payment availability model for checkout sticky bar.
 * Website checkout is Stripe-only; manual bank/PromptPay is not offered here.
 */

export type PaymentAvailability = {
  enabled: boolean;
  reason?: string;
  actionHint?: string;
};

export type PaymentMethodsAvailability = {
  stripe: PaymentAvailability;
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
 * Returns Stripe checkout availability based on checkout state.
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
    };
  }

  if (!hasDeliveryDistrict) {
    return {
      stripe: { enabled: false, reason: selectDeliveryArea, actionHint: 'Choose district first' },
    };
  }

  if (!isFormValid && firstIncompleteHint) {
    return {
      stripe: { enabled: false, reason: firstIncompleteHint, actionHint: 'Complete required fields' },
    };
  }

  return {
    stripe: { enabled: true },
  };
}

/**
 * Derived: can user proceed to Stripe checkout?
 */
export function canCheckout(availability: PaymentMethodsAvailability): boolean {
  return (
    availability.stripe.enabled &&
    !availability.stripe.reason?.includes('Processing')
  );
}
