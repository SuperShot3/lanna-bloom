'use client';

export function CatalogAiImageBadge({
  visible,
  ariaLabel,
  offsetForFavorite = false,
}: {
  visible: boolean;
  ariaLabel: string;
  offsetForFavorite?: boolean;
}) {
  if (!visible) return null;

  return (
    <span
      className={`catalog-ai-image-badge${offsetForFavorite ? ' is-beside-favorite' : ''}`}
      aria-label={ariaLabel}
    >
      AI
      <style jsx>{`
        .catalog-ai-image-badge {
          position: absolute;
          top: 8px;
          right: 8px;
          z-index: 2;
          width: 22px;
          height: 22px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          background: rgba(255, 252, 247, 0.72);
          border: 1px solid rgba(45, 42, 38, 0.1);
          color: rgba(75, 68, 60, 0.7);
          font-size: 8px;
          font-weight: 700;
          letter-spacing: 0.06em;
          line-height: 1;
          pointer-events: none;
          user-select: none;
        }
        .catalog-ai-image-badge.is-beside-favorite {
          right: 54px;
        }
      `}</style>
    </span>
  );
}
