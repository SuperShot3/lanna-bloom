'use client';

import { useState } from 'react';
import { Bouquet, BouquetSize } from '@/lib/bouquets';
import { SizeSelector } from './SizeSelector';
import { MessengerOrderButtons } from './MessengerOrderButtons';
import type { Locale } from '@/lib/i18n';

export function ProductOrderBlock({ bouquet, lang }: { bouquet: Bouquet; lang: Locale }) {
  const [selectedSize, setSelectedSize] = useState<BouquetSize>(bouquet.sizes[0]);
  const name = lang === 'th' ? bouquet.nameTh : bouquet.nameEn;

  return (
    <div className="order-block">
      <SizeSelector
        sizes={bouquet.sizes}
        selected={selectedSize}
        onSelect={setSelectedSize}
        lang={lang}
      />
      <MessengerOrderButtons
        bouquetName={name}
        sizeLabel={selectedSize.label}
        lang={lang}
      />
    </div>
  );
}
