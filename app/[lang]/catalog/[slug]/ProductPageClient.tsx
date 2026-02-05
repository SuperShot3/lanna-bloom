'use client';

import { useState } from 'react';
import { ProductGallery } from '@/components/ProductGallery';
import { ProductOrderBlock } from '@/components/ProductOrderBlock';
import type { Bouquet } from '@/lib/bouquets';
import { translations, type Locale } from '@/lib/i18n';

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
