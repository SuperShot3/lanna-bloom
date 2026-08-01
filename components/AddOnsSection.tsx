'use client';

import { translations } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';
import { BouquetsCarousel } from '@/components/BouquetsCarousel';
import { GiftsCarousel } from '@/components/GiftsCarousel';
import type { Bouquet } from '@/lib/bouquets';
import type { CatalogProduct } from '@/lib/sanity';
import { GiftCardMessagesEditor } from '@/components/GiftCardMessagesEditor';
import { useOrderGiftCardMessage } from '@/hooks/useOrderGiftCardMessage';
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

export function AddOnsSection({
  lang,
  gifts = [],
  suggestedBouquets = [],
  hideGiftAddOns = false,
}: {
  lang: Locale;
  value: AddOnsValues;
  onChange: (v: AddOnsValues) => void;
  /** Gift products from catalog (category=gifts) to display in "You might be interested" carousel */
  gifts?: CatalogProduct[];
  /** When set (e.g. plushy toy PDP), show bouquet cross-sell instead of gifts */
  suggestedBouquets?: Bouquet[];
  /** Regional flower-only funnels: hide non-flower gift carousel */
  hideGiftAddOns?: boolean;
}) {
  const tRaw = translations[lang].buyNow;
  const t = tRaw as {
    giftsSectionTitle?: string;
    flowersSectionTitle?: string;
  };
  const {
    giftCardMessages,
    setGiftCardMessageAt,
    addGiftCardMessage,
    removeGiftCardMessage,
  } = useOrderGiftCardMessage();

  return (
    <div className="addons-section">
      {!hideGiftAddOns && suggestedBouquets.length > 0 ? (
        <>
          <h3 className="addons-gifts-heading">
            {t.flowersSectionTitle ?? t.giftsSectionTitle ?? 'You might be interested as well'}
          </h3>
          <BouquetsCarousel bouquets={suggestedBouquets} lang={lang} />
        </>
      ) : !hideGiftAddOns && gifts.length > 0 ? (
        <>
          <h3 className="addons-gifts-heading">
            {t.giftsSectionTitle ?? 'You might be interested as well'}
          </h3>
          <GiftsCarousel gifts={gifts} lang={lang} />
        </>
      ) : null}
      <div className="addons-field">
        <GiftCardMessagesEditor
          lang={lang}
          messages={giftCardMessages}
          onChangeAt={setGiftCardMessageAt}
          onAdd={addGiftCardMessage}
          onRemove={removeGiftCardMessage}
          idPrefix="addons-gift-card"
        />
      </div>
      <style jsx>{`
        .addons-section {
          margin-top: 16px;
        }
        .addons-gifts-heading {
          font-size: 0.95rem;
          font-weight: 600;
          color: var(--text);
          margin: 0 0 12px;
          line-height: 1.3;
        }
        .addons-field {
          margin-top: 16px;
        }
      `}</style>
    </div>
  );
}
