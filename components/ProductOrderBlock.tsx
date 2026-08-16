'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bouquet, BouquetSize } from '@/lib/bouquets';
import { SizeSelector } from './SizeSelector';
import {
  getDefaultAddOns,
  type AddOnsValues,
} from './AddOnsSection';
import { useCart } from '@/contexts/CartContext';
import { translations } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';
import { trackAddToCart } from '@/lib/analytics';
import { getBouquetDisplayCategory } from '@/lib/catalogCategories';
import { FloristCard } from '@/components/FloristCard';
import { getAddOnsTotal } from '@/lib/addonsConfig';
import type { CatalogProduct } from '@/lib/catalog/types';
import { useCheckoutDeliveryProfile } from '@/hooks/useCheckoutDeliveryProfile';
import { useProvinceDeliveryConstraint } from '@/hooks/useProvinceDeliveryConstraint';
import { useOrderGiftCardMessage } from '@/hooks/useOrderGiftCardMessage';
import { applyCatalogDiscountThb, effectiveCatalogUnitPriceWithExpansion } from '@/lib/catalogDiscount';
import { bouquetIsAvailableForDestination } from '@/lib/bouquetDestinationAvailability';
import {
  isMay2026FreeDeliveryActive,
  qualifiesForMay2026FreeDelivery,
} from '@/lib/promo/campaigns';
import { CatalogDiscountPrice } from '@/components/CatalogDiscountPrice';
import { DeliveryFromFeeHint } from '@/components/DeliveryFromFeeHint';
import { ProductSizeCard } from '@/components/pdp/ProductSizeCard';
import { ProductDeliveryBenefitBadge } from '@/components/pdp/ProductDeliveryBenefitBadge';
import { ProductDeliveryTimingNotice } from '@/components/pdp/ProductDeliveryTimingNotice';
import { ProductContactBeforeOrderNotice } from '@/components/pdp/ProductContactBeforeOrderNotice';
import { ProductPeakCelebrationNotice } from '@/components/pdp/ProductPeakCelebrationNotice';
import { ProductPurchaseActions } from '@/components/pdp/ProductPurchaseActions';
import { ProductTrustStrip } from '@/components/pdp/ProductTrustStrip';
import { ProductGiftMessageRow } from '@/components/pdp/ProductGiftMessageRow';
import { ProductAddOnsCarousel } from '@/components/pdp/ProductAddOnsCarousel';
import { ProductStickyPurchaseBar } from '@/components/pdp/ProductStickyPurchaseBar';
import pdpStyles from '@/components/pdp/product-pdp.module.css';
import { buildMarketCatalogHref } from '@/lib/delivery/marketRoute';
import Link from 'next/link';

export function ProductOrderBlock({
  bouquet,
  lang,
  productTitle,
  selectedImageUrl,
  selectedImageIndex,
  onSelectedImageIndexChange,
  selectedSize,
  onSizeSelect,
  gifts = [],
}: {
  bouquet: Bouquet;
  lang: Locale;
  productTitle: string;
  selectedImageUrl?: string | null;
  selectedImageIndex?: number;
  onSelectedImageIndexChange?: (index: number) => void;
  selectedSize: BouquetSize;
  onSizeSelect: (size: BouquetSize) => void;
  gifts?: CatalogProduct[];
}) {
  const router = useRouter();
  const [addOns, setAddOns] = useState<AddOnsValues>(getDefaultAddOns);
  const [quantity, setQuantity] = useState(1);
  const [justAdded, setJustAdded] = useState(false);
  const [stickyBarVisible, setStickyBarVisible] = useState(false);
  const { addItem } = useCart();
  const {
    giftCardMessages,
    setGiftCardMessageAt,
    addGiftCardMessage,
    removeGiftCardMessage,
  } = useOrderGiftCardMessage();
  const checkoutProfile = useCheckoutDeliveryProfile(lang);
  const tProduct = translations[lang].product;
  const availableForDestination = bouquetIsAvailableForDestination(
    bouquet,
    checkoutProfile.destinationId
  );
  const deliveryConstraintLines = useMemo(
    () => [
      {
        itemType: 'bouquet' as const,
        deliveryOptions: bouquet.deliveryOptions,
        bouquetId: bouquet.id,
      },
    ],
    [bouquet.deliveryOptions, bouquet.id]
  );
  const { constraint: deliveryConstraint, loading: deliveryConstraintLoading } =
    useProvinceDeliveryConstraint(checkoutProfile.destinationId, deliveryConstraintLines);
  const contactBeforeOrder = bouquet.contactBeforeOrder === true;
  const purchaseDisabled =
    contactBeforeOrder ||
    !availableForDestination ||
    (!deliveryConstraintLoading && !deliveryConstraint.orderingAllowed);
  const hideGiftAddOns = checkoutProfile.variant === 'expansion';
  const destinationLabel = lang === 'th' ? checkoutProfile.labels.th : checkoutProfile.labels.en;
  const catalogHref = buildMarketCatalogHref(lang, checkoutProfile.pathSlug);
  const availableInAreaText = (
    tProduct.availableInDeliveryArea ?? 'Available for delivery in {destination}'
  ).replace('{destination}', destinationLabel);
  const changeAreaLabel = tProduct.changeDeliveryArea ?? 'Change delivery area';

  const addOnsTotal = getAddOnsTotal(addOns.productAddOns ?? {});
  const qty = Math.max(1, Math.floor(quantity));
  const discountedSizePrice = applyCatalogDiscountThb(selectedSize.price, bouquet.discountPercent);
  const unitPrice = effectiveCatalogUnitPriceWithExpansion(
    selectedSize.price,
    bouquet.discountPercent,
    checkoutProfile.destinationId,
    { extraThb: addOnsTotal }
  );
  const totalPrice = unitPrice * qty;
  const lineTotalForPromo = discountedSizePrice * qty;
  const hideDeliveryFromFee =
    isMay2026FreeDeliveryActive() && qualifiesForMay2026FreeDelivery(lineTotalForPromo);

  const addToCartCore = () => {
    if (purchaseDisabled) return;
    const itemName = lang === 'th' ? bouquet.nameTh : bouquet.nameEn;
    const price = unitPrice;
    addItem(
      {
        itemType: 'bouquet',
        bouquetId: bouquet.id,
        slug: bouquet.slug,
        nameEn: bouquet.nameEn,
        nameTh: bouquet.nameTh,
        imageUrl:
          selectedImageUrl ??
          selectedSize.imageUrls?.[0] ??
          bouquet.images?.[0],
        size: { ...selectedSize, price: discountedSizePrice },
        addOns: { ...addOns, cardMessage: '', paperColor: null },
        excludedDeliveryDestinations: bouquet.excludedDeliveryDestinations,
        ...(bouquet.deliveryOptions?.length
          ? { deliveryOptions: bouquet.deliveryOptions }
          : {}),
        ...(bouquet.discountPercent != null && {
          catalogDiscountPercent: bouquet.discountPercent,
        }),
      },
      qty
    );
    trackAddToCart({
      currency: 'THB',
      value: totalPrice,
      items: [
        {
          item_id: bouquet.id,
          item_name: itemName,
          price,
          quantity: qty,
          index: 0,
          item_category: getBouquetDisplayCategory(bouquet),
          item_variant: selectedSize.label,
        },
      ],
    });
  };

  const handleAddToCart = () => {
    if (purchaseDisabled) return;
    addToCartCore();
    setJustAdded(true);
  };

  const handleBuyNow = () => {
    if (purchaseDisabled) return;
    addToCartCore();
    router.push(`/${lang}/cart`);
  };

  useEffect(() => {
    if (justAdded) setJustAdded(false);
  }, [selectedSize.optionId, quantity]);

  return (
    <div className={`order-block ${!contactBeforeOrder && stickyBarVisible ? 'order-block--sticky-pad' : ''}`}>
      <div className={pdpStyles.pdpPriceRow}>
        <CatalogDiscountPrice
          basePriceThb={selectedSize.price}
          discountPercent={bouquet.discountPercent}
          extraThb={addOnsTotal}
          destinationId={checkoutProfile.destinationId}
          lang={lang}
          className={pdpStyles.pdpUnitPrice}
          amountClassName={pdpStyles.pdpUnitPriceAmount}
        />
        {!hideDeliveryFromFee ? (
          <DeliveryFromFeeHint
            lang={lang}
            destinationId={checkoutProfile.destinationId}
            variant="pdp"
          />
        ) : null}
        <ProductDeliveryBenefitBadge
          lang={lang}
          lineTotalThb={lineTotalForPromo}
          destinationLabel={destinationLabel}
        />
      </div>

      {bouquet.sizes.length > 1 ? (
        <ProductSizeCard
          sizes={bouquet.sizes}
          selected={selectedSize}
          onSelect={onSizeSelect}
          lang={lang}
          destinationId={checkoutProfile.destinationId}
          discountPercent={bouquet.discountPercent}
        />
      ) : null}

      {bouquet.sizes.length > 1 ? (
        <div className={pdpStyles.desktopOnly}>
          <SizeSelector
            sizes={bouquet.sizes}
            selected={selectedSize}
            onSelect={onSizeSelect}
            lang={lang}
            destinationId={checkoutProfile.destinationId}
            discountPercent={bouquet.discountPercent}
          />
        </div>
      ) : null}

      {!availableForDestination ? (
        <div className="order-destination-block-notice" role="alert">
          <p>{tProduct.unavailableInDeliveryArea}</p>
          <p>
            <Link
              href={`/${lang}/delivery-areas-thailand`}
              className="order-destination-change-link"
            >
              {changeAreaLabel}
            </Link>
          </p>
        </div>
      ) : (
        <p className="order-destination-available" role="status">
          {availableInAreaText}
        </p>
      )}

      <ProductDeliveryTimingNotice
        lang={lang}
        constraint={deliveryConstraint}
        loading={deliveryConstraintLoading}
      />

      {contactBeforeOrder ? (
        <ProductContactBeforeOrderNotice
          lang={lang}
          productName={productTitle}
          sizeLabel={selectedSize.label}
        />
      ) : (
        <ProductPurchaseActions
          lang={lang}
          totalPrice={totalPrice}
          onAddToCart={handleAddToCart}
          onBuyNow={handleBuyNow}
          disabled={purchaseDisabled}
          justAdded={justAdded}
          catalogHref={catalogHref}
        />
      )}

      <ProductTrustStrip
        lang={lang}
        showSameDay={checkoutProfile.variant === 'chiang-mai'}
        destinationSub={destinationLabel}
      />

      <ProductPeakCelebrationNotice lang={lang} />

      <ProductGiftMessageRow
        lang={lang}
        messages={giftCardMessages}
        onChangeAt={setGiftCardMessageAt}
        onAdd={addGiftCardMessage}
        onRemove={removeGiftCardMessage}
        itemLabel={lang === 'th' ? bouquet.nameTh || bouquet.nameEn : bouquet.nameEn}
      />

      <div className={pdpStyles.qtyRow}>
        <span className={pdpStyles.qtyLabel}>{translations[lang].buyNow.quantity ?? 'Quantity'}</span>
        <div className={pdpStyles.qtyControl}>
          <button
            type="button"
            className={pdpStyles.qtyBtn}
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            aria-label="Decrease quantity"
          >
            −
          </button>
          <span className={pdpStyles.qtyValue}>{quantity}</span>
          <button
            type="button"
            className={pdpStyles.qtyBtn}
            onClick={() => setQuantity((q) => q + 1)}
            aria-label="Increase quantity"
          >
            +
          </button>
        </div>
      </div>

      {!hideGiftAddOns && gifts.length > 0 ? (
        <ProductAddOnsCarousel lang={lang} gifts={gifts} />
      ) : null}

      {(bouquet.partnerName || bouquet.partnerId) && (
        <div className="mb-6">
          <FloristCard
            lang={lang}
            partnerName={bouquet.partnerName}
            partnerImage={bouquet.partnerPortraitUrl ?? null}
            studioName={bouquet.partnerCity || 'Chiang Mai'}
            quote={
              (lang === 'th' ? bouquet.partnerShopBioTh : bouquet.partnerShopBioEn) ||
              "We source our flowers daily from local markets to ensure maximum freshness and fragrance in every arrangement."
            }
          />
        </div>
      )}

      {!contactBeforeOrder ? (
        <ProductStickyPurchaseBar
          lang={lang}
          productTitle={productTitle}
          thumbUrl={selectedImageUrl}
          totalPrice={totalPrice}
          onAddToCart={handleAddToCart}
          disabled={purchaseDisabled}
          justAdded={justAdded}
          onVisibilityChange={setStickyBarVisible}
        />
      ) : null}

      <style jsx>{`
        .order-destination-block-notice {
          margin: 0 0 12px;
          padding: 12px 14px;
          font-size: 0.9rem;
          line-height: 1.45;
          color: var(--text);
          background: #fff5f0;
          border: 1px solid #e8c4b8;
          border-radius: var(--radius-sm);
        }
        .order-destination-block-notice p {
          margin: 0;
        }
        .order-destination-block-notice p + p {
          margin-top: 8px;
        }
        .order-destination-block-notice :global(.order-destination-change-link) {
          color: var(--primary, #1a3c34);
          font-weight: 600;
          text-decoration: underline;
          text-underline-offset: 2px;
        }
        .order-destination-available {
          margin: 0 0 12px;
          font-size: 0.875rem;
          line-height: 1.4;
          color: var(--text-muted, #6b7280);
        }
      `}</style>
    </div>
  );
}
