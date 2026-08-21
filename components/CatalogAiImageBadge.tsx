'use client';

export function CatalogAiImageBadge({
  visible,
  ariaLabel,
  placement = 'top-right',
  offsetLeft = false,
  compact = false,
}: {
  visible: boolean;
  ariaLabel: string;
  placement?: 'top-right' | 'bottom-right';
  offsetLeft?: boolean;
  compact?: boolean;
}) {
  if (!visible) return null;

  return (
    <span
      className={`catalog-ai-image-badge${compact ? ' is-compact' : ''}${placement === 'bottom-right' ? ' is-bottom-right' : ''}${offsetLeft ? ' is-offset-left' : ''}`}
      aria-label={ariaLabel}
    >
      AI
      <style jsx>{`
        .catalog-ai-image-badge {
          position: absolute;
          top: 8px;
          right: 8px;
          z-index: 2;
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          background: rgba(255, 252, 247, 0.78);
          border: 1px solid rgba(45, 42, 38, 0.12);
          color: rgba(75, 68, 60, 0.78);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.06em;
          line-height: 1;
          pointer-events: none;
          user-select: none;
        }
        .catalog-ai-image-badge.is-bottom-right {
          top: auto;
          bottom: 8px;
        }
        .catalog-ai-image-badge.is-compact {
          top: 4px;
          right: 4px;
          width: 20px;
          height: 20px;
          font-size: 8px;
        }
        .catalog-ai-image-badge.is-compact.is-bottom-right {
          top: auto;
          bottom: 4px;
        }
        .catalog-ai-image-badge.is-offset-left {
          right: 52px;
        }
      `}</style>
    </span>
  );
}
