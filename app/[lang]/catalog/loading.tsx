import { BouquetCardSkeleton } from '@/components/BouquetCardSkeleton';

export default function CatalogLoading() {
  return (
    <div className="catalog-page">
      <div className="container">
        <div className="catalog-title-skeleton" aria-hidden />
        <div className="catalog-grid">
          {Array.from({ length: 9 }).map((_, i) => (
            <BouquetCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
