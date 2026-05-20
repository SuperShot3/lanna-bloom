'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type CheckoutStickyHeaderPayload = {
  total: number;
  itemSummary?: string | null;
  hasToyItem?: boolean;
  deliveryScheduleLine?: string | null;
  deliveryFee: number;
  deliveryFeeGross?: number;
  deliveryFeeKnown: boolean;
  deliveryFeeLabel: string;
  deliveryFreeLabel: string;
  deliveryPendingLabel: string;
  policyHint: string;
  policyDeliveryLabel: string;
  policyRefundLabel: string;
  giftMessageLabel: string;
  securePaymentLabel: string;
  deliveryPolicyHref: string;
  refundPolicyHref: string;
  readyToPay: boolean;
  loading: boolean;
  disabled: boolean;
  onAction: () => void;
  continueLabel: string;
  payNowLabel: string;
};

export type CheckoutHeaderCollapseMode = 'expanded' | 'compact';

type CheckoutStickyHeaderContextValue = {
  payload: CheckoutStickyHeaderPayload | null;
  setPayload: (payload: CheckoutStickyHeaderPayload | null) => void;
  collapseMode: CheckoutHeaderCollapseMode;
  setCollapseMode: (mode: CheckoutHeaderCollapseMode) => void;
};

const CheckoutStickyHeaderContext = createContext<CheckoutStickyHeaderContextValue | null>(
  null
);

export function CheckoutStickyHeaderProvider({ children }: { children: ReactNode }) {
  const [payload, setPayloadState] = useState<CheckoutStickyHeaderPayload | null>(null);
  const [collapseMode, setCollapseMode] = useState<CheckoutHeaderCollapseMode>('expanded');

  const setPayload = useCallback((next: CheckoutStickyHeaderPayload | null) => {
    setPayloadState(next);
    if (!next) setCollapseMode('expanded');
  }, []);

  const value = useMemo(
    () => ({
      payload,
      setPayload,
      collapseMode,
      setCollapseMode,
    }),
    [payload, setPayload, collapseMode]
  );

  return (
    <CheckoutStickyHeaderContext.Provider value={value}>
      {children}
    </CheckoutStickyHeaderContext.Provider>
  );
}

export function useCheckoutStickyHeader() {
  const ctx = useContext(CheckoutStickyHeaderContext);
  if (!ctx) {
    throw new Error('useCheckoutStickyHeader must be used within CheckoutStickyHeaderProvider');
  }
  return ctx;
}

/** Safe for Header when provider is always present in lang layout. */
export function useCheckoutStickyHeaderOptional() {
  return useContext(CheckoutStickyHeaderContext);
}
