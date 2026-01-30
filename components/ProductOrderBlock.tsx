'use client';

import { useState } from 'react';
import { Bouquet, BouquetSize } from '@/lib/bouquets';
import { SizeSelector } from './SizeSelector';
import { MessengerOrderButtons } from './MessengerOrderButtons';
import { DeliveryForm, type DeliveryFormValues } from './DeliveryForm';
import type { Locale } from '@/lib/i18n';

export function ProductOrderBlock({ bouquet, lang }: { bouquet: Bouquet; lang: Locale }) {
  const [selectedSize, setSelectedSize] = useState<BouquetSize>(bouquet.sizes[0]);
  const [delivery, setDelivery] = useState<DeliveryFormValues>({ district: null, date: '' });
  const name = lang === 'th' ? bouquet.nameTh : bouquet.nameEn;

  const deliveryAddress =
    delivery.district && lang === 'th'
      ? `เชียงใหม่ ${delivery.district.nameTh}`
      : delivery.district
        ? `Chiang Mai, ${delivery.district.nameEn}`
        : '';
  const deliveryDate = delivery.date || '';

  return (
    <div className="order-block">
      <DeliveryForm lang={lang} value={delivery} onChange={setDelivery} />
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
        deliveryAddress={deliveryAddress}
        deliveryDate={deliveryDate}
      />
    </div>
  );
}
