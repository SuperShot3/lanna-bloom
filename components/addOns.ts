import type { WrappingPaperColorSelection } from '@/lib/wrappingPaperColors';

export type CardType = 'free' | 'beautiful' | null;
export type WrappingPreference = 'none' | 'classic' | 'premium' | null;

export interface AddOnsValues {
  cardType: CardType;
  /** @deprecated Order-level giftCardMessages; kept empty for cart line compatibility. */
  cardMessage: string;
  wrappingPreference: WrappingPreference;
  /** Bouquet wrapping-paper color preference (display-only for florists). */
  paperColor?: WrappingPaperColorSelection;
  /** Custom text to write/print on standalone balloons. */
  balloonText?: string;
  /** Product add-ons (legacy) — kept for cart/order compatibility */
  productAddOns?: Record<string, boolean>;
}

export const CARD_BEAUTIFUL_PRICE_THB = 20;

const defaultAddOns: AddOnsValues = {
  cardType: null,
  cardMessage: '',
  wrappingPreference: null,
  paperColor: null,
  productAddOns: {},
};

export function getDefaultAddOns(): AddOnsValues {
  return { ...defaultAddOns, productAddOns: {} };
}
