'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { ProductGallery } from '@/components/ProductGallery';
import { ProductOrderBlock } from '@/components/ProductOrderBlock';
import { ProductAboutSection } from '@/components/pdp/ProductAboutSection';
import { ProductShareLink } from '@/components/ProductShareLink';
import type { Bouquet } from '@/lib/bouquets';
import type { CatalogProduct } from '@/lib/catalog/types';
import type { ProductReview, ProductReviewStats } from '@/lib/productReviews';
import { translations, type Locale } from '@/lib/i18n';
import { trackViewItem } from '@/lib/analytics';
import { getBouquetDisplayCategory } from '@/lib/catalogCategories';
import { CatalogDiscountBadge } from '@/components/CatalogDiscountBadge';
import { optionDisplayLabel } from '@/lib/bouquetOptions';
import pdpStyles from '@/components/pdp/product-pdp.module.css';
import { getPreferredBouquetSize } from '@/lib/favorites';
import { imageIndexForSizeIndex, sizeIndexForImageIndex } from '@/lib/pdpVariantMedia';

export function ProductPageClient({
  bouquet,
  lang,
  name,
  titleIntro,
  description,
  compositionText,
  floristNote,
  reviews,
  reviewStats,
  gifts = [],
}: {
  bouquet: Bouquet;
  lang: Locale;
  name: string;
  titleIntro?: string;
  description: string;
  compositionText: string;
  floristNote?: string;
  reviews: ProductReview[];
  reviewStats: ProductReviewStats;
  gifts?: CatalogProduct[];
}) {
  const resolveInitialSize = (): Bouquet['sizes'][number] => {
    const preferredId = getPreferredBouquetSize(bouquet.id);
    if (preferredId) {
      const found = bouquet.sizes.find((s) => s.optionId === preferredId);
      if (found) return found;
      const legacy = bouquet.sizes.find((s) => s.key === preferredId);
      if (legacy) return legacy;
    }
    return bouquet.sizes[0];
  };
  const [selectedSize, setSelectedSize] = useState<Bouquet['sizes'][number]>(resolveInitialSize);
  /** Match the gallery slide to a returning visitor's saved tier preference, not always slide 0. */
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(() => {
    const size = resolveInitialSize();
    if (size.imageUrls?.length) return 0;
    const imageCount = bouquet.images?.length ?? 0;
    const sizeIndex = bouquet.sizes.findIndex((candidate) => candidate.optionId === size.optionId);
    if (sizeIndex >= 0 && imageCount > 0) return imageIndexForSizeIndex(sizeIndex, imageCount);
    return 0;
  });
  /** Shared gallery (bouquet.images) vs. a per-size photo set — only the shared gallery maps to tiers by index. */
  const usesSharedGallery = !selectedSize.imageUrls?.length;
  const galleryImages = useMemo(() => {
    if (selectedSize.imageUrls?.length) return selectedSize.imageUrls;
    return bouquet.images ?? [];
  }, [selectedSize.optionId, selectedSize.imageUrls, bouquet.images]);

  const galleryAlts = useMemo(() => {
    if (selectedSize.imageAlts?.length) return selectedSize.imageAlts;
    return bouquet.imageAlts;
  }, [selectedSize.optionId, selectedSize.imageAlts, bouquet.imageAlts]);

  const galleryAiGenerated = useMemo(() => {
    if (selectedSize.imageUrls?.length) return selectedSize.imageAiGenerated;
    return bouquet.imageAiGenerated;
  }, [selectedSize.optionId, selectedSize.imageUrls, selectedSize.imageAiGenerated, bouquet.imageAiGenerated]);

  /** Tier button click → scroll the carousel to the matching photo (or reset for a per-size gallery). */
  const handleSizeSelect = useCallback(
    (size: Bouquet['sizes'][number]) => {
      setSelectedSize(size);
      if (size.imageUrls?.length) {
        setSelectedImageIndex(0);
        return;
      }
      const imageCount = bouquet.images?.length ?? 0;
      const sizeIndex = bouquet.sizes.findIndex((candidate) => candidate.optionId === size.optionId);
      if (sizeIndex >= 0 && imageCount > 0) {
        setSelectedImageIndex(imageIndexForSizeIndex(sizeIndex, imageCount));
      }
    },
    [bouquet.images, bouquet.sizes]
  );

  const selectedImageUrl =
    galleryImages[selectedImageIndex] ?? galleryImages[0] ?? undefined;
  const sizeCaptionLabel = selectedSize
    ? optionDisplayLabel(selectedSize, lang)
    : '';
  const sizeCaption = sizeCaptionLabel
    ? (translations[lang].product.sizeShownInPhotos ?? 'Photos show: {size}').replace(
        '{size}',
        sizeCaptionLabel
      )
    : undefined;

  useEffect(() => {
    const itemName = lang === 'th' ? bouquet.nameTh : bouquet.nameEn;
    const price = bouquet.sizes?.[0]?.price ?? 0;
    const sizeLabel = bouquet.sizes?.[0]?.label;
    trackViewItem({
      currency: 'THB',
      value: price,
      items: [
        {
          item_id: bouquet.id,
          item_name: itemName,
          price,
          quantity: 1,
          index: 0,
          item_category: getBouquetDisplayCategory(bouquet),
          item_variant: sizeLabel,
        },
      ],
    });
  }, [bouquet, lang]);

  /** Swipe/chevron/dot navigation → select the matching tier when browsing the shared gallery. */
  const handleImageIndexChange = useCallback(
    (index: number) => {
      setSelectedImageIndex(index);
      if (!usesSharedGallery || bouquet.sizes.length <= 1) return;
      const sizeIndex = sizeIndexForImageIndex(index, bouquet.sizes.length);
      if (sizeIndex == null) return;
      const matchedSize = bouquet.sizes[sizeIndex];
      if (matchedSize && matchedSize.optionId !== selectedSize.optionId) {
        setSelectedSize(matchedSize);
      }
    },
    [usesSharedGallery, bouquet.sizes, selectedSize.optionId]
  );

  return (
    <>
      <div className="product-gallery-wrap" style={{ position: 'relative' }}>
        <CatalogDiscountBadge
          discountPercent={bouquet.discountPercent}
          ariaLabel={translations[lang].catalog.discountAria ?? 'On sale — {percent}% off'}
        />
        <ProductGallery
          images={galleryImages}
          imageAlts={galleryAlts}
          imageAiGenerated={galleryAiGenerated}
          aiImageAriaLabel={translations[lang].catalog.aiImageAria ?? 'AI-generated image'}
          name={name}
          productId={bouquet.id}
          activeIndex={selectedImageIndex}
          onActiveChange={handleImageIndexChange}
          sizeCaption={sizeCaption}
        />
      </div>
      <div className="product-info">
        <div className={pdpStyles.productIdentity}>
          <div className={pdpStyles.identityHeader}>
            <h1 className="product-title">{name}</h1>
            <div className={pdpStyles.shareAction}>
              <ProductShareLink lang={lang} productTitle={name} />
            </div>
          </div>
          {titleIntro?.trim() ? (
            <p className={pdpStyles.identityIntro}>{titleIntro.trim()}</p>
          ) : null}
        </div>
        <ProductOrderBlock
          bouquet={bouquet}
          lang={lang}
          productTitle={name}
          selectedImageUrl={selectedImageUrl}
          selectedImageIndex={selectedImageIndex}
          onSelectedImageIndexChange={handleImageIndexChange}
          selectedSize={selectedSize}
          onSizeSelect={handleSizeSelect}
          gifts={gifts}
        />
        <ProductAboutSection
          lang={lang}
          description={description}
          floristNote={floristNote}
          compositionText={compositionText}
          bouquetId={bouquet.id}
          reviews={reviews}
          reviewStats={reviewStats}
        />
      </div>
    </>
  );
}
