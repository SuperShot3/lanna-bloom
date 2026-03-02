'use client';

import { useState, useEffect } from 'react';
import { ProductGallery } from '@/components/ProductGallery';
import { ProductOrderBlockForProduct } from '@/components/ProductOrderBlockForProduct';
import type { CatalogProduct } from '@/lib/sanity';
import { translations, type Locale } from '@/lib/i18n';
import { trackViewItem } from '@/lib/analytics';
import { computeFinalPrice } from '@/lib/partnerPricing';

export function ProductDetailClient({
  product,
  lang,
  name,
  description,
}: {
  product: CatalogProduct;
  lang: Locale;
  name: string;
  description: string;
}) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const images = product.images ?? [];
  const selectedImageUrl = images[selectedImageIndex] ?? images[0];
  const descDisplay = description?.trim() || (lang === 'th' ? 'ยังไม่มีรายละเอียดสินค้า' : 'No description provided.');
  const finalPrice = computeFinalPrice(product.price, product.commissionPercent);

  useEffect(() => {
    trackViewItem({
      currency: 'THB',
      value: finalPrice,
      items: [
        {
          item_id: product.id,
          item_name: name,
          price: finalPrice,
          quantity: 1,
          index: 0,
          item_category: product.category,
        },
      ],
    });
  }, [product.id, product.price, product.commissionPercent, product.category, name, lang, finalPrice]);

  return (
    <>
      <div className="product-gallery-wrap">
        <ProductGallery
          images={images}
          name={name}
          productId={product.id}
          activeIndex={selectedImageIndex}
          onActiveChange={setSelectedImageIndex}
        />
      </div>
      <div className="product-info">
        <p className="product-desc">{descDisplay}</p>
        {(product.preparationTime != null || product.occasion) && (
          <div className="product-attributes">
            {product.preparationTime != null && (
              <p className="product-attr">
                <span className="product-attr-label">{translations[lang].product.preparationTime}:</span>{' '}
                ~{product.preparationTime} {translations[lang].buyNow.minutes}
              </p>
            )}
            {product.occasion && (
              <p className="product-attr">
                <span className="product-attr-label">{translations[lang].product.occasion}:</span> {product.occasion}
              </p>
            )}
          </div>
        )}
        <div className="product-price-block">
          <span className="product-price">฿{finalPrice.toLocaleString()}</span>
        </div>
        <ProductOrderBlockForProduct
          product={product}
          lang={lang}
          selectedImageUrl={selectedImageUrl}
        />
      </div>
    </>
  );
}
