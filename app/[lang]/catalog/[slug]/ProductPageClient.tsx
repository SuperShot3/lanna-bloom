'use client';

import { useState, useEffect, useMemo } from 'react';
import { ProductGallery } from '@/components/ProductGallery';
import { ProductOrderBlock } from '@/components/ProductOrderBlock';
import { CareGuideSection } from '@/components/CareGuideSection';
import type { Bouquet } from '@/lib/bouquets';
import type { CatalogProduct } from '@/lib/sanity';
import { translations, type Locale } from '@/lib/i18n';
import { trackViewItem } from '@/lib/analytics';

export function ProductPageClient({
  bouquet,
  lang,
  name,
  description,
  compositionHeading,
  compositionText,
  gifts = [],
}: {
  bouquet: Bouquet;
  lang: Locale;
  name: string;
  description: string;
  compositionHeading: string;
  compositionText: string;
  gifts?: CatalogProduct[];
}) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const images = useMemo(
    () => bouquet.images ?? [],
    [bouquet.id, bouquet.images?.join?.() ?? '']
  );
  const selectedImageUrl =
    images[selectedImageIndex] ?? images[0] ?? undefined;

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
          item_category: bouquet.category,
          item_variant: sizeLabel,
        },
      ],
    });
  }, [bouquet.id, bouquet.nameEn, bouquet.nameTh, bouquet.sizes, bouquet.category, lang]);

  return (
    <>
      <div className="product-gallery-wrap pb-24 md:pb-0">
        <ProductGallery
          images={images}
          name={name}
          productId={bouquet.id}
          activeIndex={selectedImageIndex}
          onActiveChange={setSelectedImageIndex}
        />
      </div>
      <div className="product-info">
        <h1 className="product-title">{name}</h1>
        <ProductOrderBlock
          bouquet={bouquet}
          lang={lang}
          selectedImageUrl={selectedImageUrl}
          gifts={gifts}
        />
        <div className="product-details-below">
          <h2 className="product-section-heading">{translations[lang].product.descriptionHeading}</h2>
          <p className="product-desc">{description}</p>
          <div className="product-composition">
            <h2 className="composition-heading">{compositionHeading}</h2>
            <p className="composition-text">{compositionText}</p>
          </div>
          <p className="product-seasonal-disclaimer">
            {translations[lang].product.seasonalDisclaimer}
          </p>
          <CareGuideSection lang={lang} />
        </div>
      </div>
    </>
  );
}
