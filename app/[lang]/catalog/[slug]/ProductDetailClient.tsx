'use client';

import { useState, useEffect } from 'react';
import { ProductGallery } from '@/components/ProductGallery';
import type { CatalogProduct } from '@/lib/sanity';
import { translations, type Locale } from '@/lib/i18n';
import { getLineOrderUrl } from '@/lib/messenger';
import { trackViewItem } from '@/lib/analytics';

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

  const orderMessage = `Hello! I'd like to order: ${name} — ฿${product.price.toLocaleString()}`;
  const lineUrl = getLineOrderUrl(orderMessage);
  const t = translations[lang].product;

  useEffect(() => {
    trackViewItem({
      currency: 'THB',
      value: product.price,
      items: [
        {
          item_id: product.id,
          item_name: name,
          price: product.price,
          quantity: 1,
          index: 0,
          item_category: product.category,
        },
      ],
    });
  }, [product.id, product.price, product.category, name, lang]);

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
        <h1 className="product-title">{name}</h1>
        <p className="product-desc">{description}</p>
        <div className="product-price-block">
          <span className="product-price">฿{product.price.toLocaleString()}</span>
        </div>
        <a
          href={lineUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="product-order-line-btn"
        >
          {t.orderLine}
        </a>
      </div>
    </>
  );
}
