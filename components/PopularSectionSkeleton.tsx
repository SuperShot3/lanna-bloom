'use client';

import { BouquetCardSkeleton } from '@/components/BouquetCardSkeleton';

export function PopularSectionSkeleton() {
  return (
    <section className="popular-section-skeleton">
      <div className="container">
        <div className="popular-title-skeleton" aria-hidden />
        <div className="popular-grid-skeleton">
          {Array.from({ length: 8 }).map((_, i) => (
            <BouquetCardSkeleton key={i} />
          ))}
        </div>
      </div>
      <style jsx>{`
        .popular-section-skeleton {
          padding: 0 0 48px;
        }
        .popular-grid-skeleton {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
        }
        @media (min-width: 600px) {
          .popular-grid-skeleton {
            grid-template-columns: repeat(3, 1fr);
          }
        }
        @media (min-width: 900px) {
          .popular-grid-skeleton {
            grid-template-columns: repeat(4, 1fr);
          }
        }
        .popular-title-skeleton {
          width: 180px;
          height: 28px;
          margin-bottom: 20px;
          border-radius: 4px;
          background: var(--pastel-cream);
          animation: skeleton-pulse 1.5s ease-in-out infinite;
        }
        @keyframes skeleton-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
      `}</style>
    </section>
  );
}
