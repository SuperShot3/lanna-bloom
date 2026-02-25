'use client';

export function BouquetCardSkeleton() {
  return (
    <article className="card-skeleton" aria-hidden>
      <div className="card-skeleton-image" />
      <div className="card-skeleton-body">
        <div className="card-skeleton-title" />
        <div className="card-skeleton-price" />
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
          border-radius: var(--radius);
        }
        .card-skeleton-body {
          padding: 11px 12px 13px;
        }
        .card-skeleton-title {
          height: 18px;
          width: 85%;
          margin-bottom: 6px;
          border-radius: 4px;
          background: var(--pastel-cream);
          animation: skeleton-pulse 1.5s ease-in-out infinite;
        }
        .card-skeleton-price {
          height: 14px;
          width: 45%;
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
