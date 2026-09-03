import { BouquetCard } from '@/components/BouquetCard';
import { ProductCard } from '@/components/ProductCard';
import type { Bouquet } from '@/lib/bouquets';
import type { CatalogProduct } from '@/lib/catalog/types';
import type { Locale } from '@/lib/i18n';

/** Homepage bouquet card — same catalog card (proof icons, favorite, buy/cart). */
export function HomeBouquetCard({
  bouquet,
  lang,
}: {
  bouquet: Bouquet;
  lang: Locale;
}) {
  return <BouquetCard bouquet={bouquet} lang={lang} desktopHoverGallery />;
}

/** Homepage product card — same catalog card (proof icons, favorite, buy/cart). */
export function HomeProductCard({
  product,
  lang,
}: {
  product: CatalogProduct;
  lang: Locale;
}) {
  return <ProductCard product={product} lang={lang} desktopHoverGallery />;
}
