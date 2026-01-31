'use client';

export function BouquetCardSkeleton() {
  return (
    <article className="card-skeleton" aria-hidden>
      <div className="card-skeleton-image" />
      <div className="card-skeleton-body">
        <div className="card-skeleton-title" />
        <div className="card-skeleton-price" />
        <div className="card-skeleton-cta" />
      </div>
      <style jsx>{`
        .card-skeleton {
          background: var(--surface);
          border-radius: var(--radius);
          overflow: hidden;
          border: 1px solid var(--border);
        }
        .card-skeleton-image {
          aspect-ratio: 1;
          background: var(--pastel-cream);
          animation: skeleton-pulse 1.5s ease-in-out infinite;
        }
        .card-skeleton-body {
          padding: 16px;
        }
        .card-skeleton-title {
          height: 20px;
          width: 80%;
          margin-bottom: 8px;
          border-radius: 4px;
          background: var(--pastel-cream);
          animation: skeleton-pulse 1.5s ease-in-out infinite;
        }
        .card-skeleton-price {
          height: 16px;
          width: 50%;
          margin-bottom: 10px;
          border-radius: 4px;
          background: var(--pastel-cream);
          animation: skeleton-pulse 1.5s ease-in-out infinite;
        }
        .card-skeleton-cta {
          height: 16px;
          width: 90px;
          border-radius: 4px;
          background: var(--pastel-cream);
          animation: skeleton-pulse 1.5s ease-in-out infinite;
        }
        @keyframes skeleton-pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.6;
          }
        }
      `}</style>
    </article>
  );
}
