'use client';

import { useState, useEffect } from 'react';
import { ProductGallery } from '@/components/ProductGallery';
import { ProductOrderBlock } from '@/components/ProductOrderBlock';
import type { Bouquet } from '@/lib/bouquets';
import { translations, type Locale } from '@/lib/i18n';
import { trackViewItem } from '@/lib/analytics';

export function ProductPageClient({
  bouquet,
  lang,
  name,
  description,
  compositionHeading,
  compositionText,
}: {
  bouquet: Bouquet;
  lang: Locale;
  name: string;
  description: string;
  compositionHeading: string;
  compositionText: string;
}) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const images = bouquet.images ?? [];
  const selectedImageUrl =
    images[selectedImageIndex] ?? images[0] ?? undefined;

  useEffect(() => {
    const itemName = lang === 'th' ? bouquet.nameTh : bouquet.nameEn;
    const price = bouquet.sizes?.[0]?.price ?? 0;
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
        },
      ],
    });
  }, [bouquet.id, bouquet.nameEn, bouquet.nameTh, bouquet.sizes, bouquet.category, lang]);

  return (
    <>
      <div className="product-gallery-wrap">
        <ProductGallery
          images={bouquet.images}
          name={name}
          activeIndex={selectedImageIndex}
          onActiveChange={setSelectedImageIndex}
        />
      </div>
      <div className="product-info">
        <h1 className="product-title">{name}</h1>
        <p className="product-desc">{description}</p>
        <div className="product-composition">
          <h2 className="composition-heading">{compositionHeading}</h2>
          <p className="composition-text">{compositionText}</p>
        </div>
        <p className="product-seasonal-disclaimer">
          {translations[lang].product.seasonalDisclaimer}
        </p>
        <ProductOrderBlock
          bouquet={bouquet}
          lang={lang}
          selectedImageUrl={selectedImageUrl}
        />
      </div>
    </>
  );
}
