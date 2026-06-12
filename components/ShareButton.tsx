'use client';

import { useToast } from '@/contexts/ToastContext';

export interface ShareButtonProps {
  url: string;
  title: string;
  text?: string;
  /** Optional: show Facebook share link (for article page) */
  showFacebook?: boolean;
  /** Aria label for the Share button */
  ariaLabel?: string;
  /** Visible label (hidden in compact variant). Defaults to "Share". */
  buttonText?: string;
  /** Toast when link is copied (clipboard fallback) */
  copySuccessMessage?: string;
  copyErrorMessage?: string;
  /** Optional className for styling */
  className?: string;
  /** Compact variant for card footer; iconOnly = bordered icon button (e.g. PDP) */
  variant?: 'default' | 'compact' | 'iconOnly';
}

export function ShareButton({
  url,
  title,
  text,
  showFacebook = false,
  ariaLabel = 'Share',
  buttonText = 'Share',
  copySuccessMessage = 'Link copied',
  copyErrorMessage = 'Could not copy link',
  className = '',
  variant = 'default',
}: ShareButtonProps) {
  const { showToast } = useToast();

  const resolveUrl = () => {
    if (url && url !== '#') return url;
    if (typeof window !== 'undefined') return window.location.href;
    return url;
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const resolvedUrl = resolveUrl();
    if (!resolvedUrl || resolvedUrl === '#') return;

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title,
          text: text ?? title,
          url: resolvedUrl,
        });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          await copyToClipboard(resolvedUrl);
        }
      }
    } else {
      await copyToClipboard(resolvedUrl);
    }
  };

  const copyToClipboard = async (urlToCopy: string) => {
    try {
      await navigator.clipboard.writeText(urlToCopy);
      showToast(copySuccessMessage);
    } catch {
      showToast(copyErrorMessage);
    }
  };

  const handleFacebookShare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const resolvedUrl = resolveUrl();
    if (!resolvedUrl || resolvedUrl === '#') return;
    const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(resolvedUrl)}`;
    window.open(fbUrl, '_blank', 'noopener,noreferrer,width=600,height=400');
  };

  return (
    <div className={`share-button-wrap ${variant} ${className}`.trim()}>
      <button
        type="button"
        onClick={handleShare}
        className="share-button"
        aria-label={ariaLabel}
        title={ariaLabel}
      >
        {variant === 'iconOnly' ? <AppleShareIcon /> : <ShareIcon />}
        {variant !== 'iconOnly' ? (
          <span className="share-button-text">{buttonText}</span>
        ) : null}
      </button>
      {showFacebook && (
        <button
          type="button"
          onClick={handleFacebookShare}
          className="share-button"
          aria-label="Share on Facebook"
          title="Share on Facebook"
        >
          <FacebookIcon />
          <span className="share-button-text">Facebook</span>
        </button>
      )}
      <style jsx>{`
        .share-button-wrap {
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }
        .share-button-wrap.compact .share-button-text {
          display: inline;
          font-size: 0.7rem;
          line-height: 1;
        }
        .share-button-wrap.compact .share-button {
          flex-direction: column;
          justify-content: center;
          gap: 4px;
          min-width: 56px;
          padding: 6px 8px;
          background: #4e342e;
          border-color: #4e342e;
          color: #fff;
        }
        .share-button {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 12px;
          background: transparent;
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--text-muted);
          cursor: pointer;
          transition: background 0.2s, color 0.2s, border-color 0.2s;
        }
        .share-button:hover,
        .share-button:focus-visible {
          background: var(--pastel-cream);
          color: var(--text);
          border-color: var(--accent);
        }
        .share-button-wrap.compact .share-button:hover,
        .share-button-wrap.compact .share-button:focus-visible {
          background: #3e2723;
          border-color: #3e2723;
          color: #fff;
        }
        .share-button-wrap.iconOnly .share-button {
          flex-direction: row;
          justify-content: center;
          align-items: center;
          gap: 0;
          width: 60px;
          height: 60px;
          min-width: 60px;
          padding: 0;
          background: transparent;
          border: none;
          border-radius: 8px;
          color: var(--text);
          opacity: 1;
        }
        .share-button-wrap.iconOnly .share-button:hover,
        .share-button-wrap.iconOnly .share-button:focus-visible {
          background: rgba(0, 0, 0, 0.06);
          border: none;
          color: var(--text);
          opacity: 1;
        }
        .share-button-wrap.iconOnly .share-button :global(.share-apple-icon) {
          display: block;
          width: 33px;
          height: 33px;
          flex-shrink: 0;
        }
        .share-button:focus-visible {
          outline: 2px solid var(--accent);
          outline-offset: 2px;
        }
        .share-button.compact {
          padding: 6px 10px;
        }
        .share-button-text {
          font-family: inherit;
        }
      `}</style>
    </div>
  );
}

function ShareIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  );
}

/** Apple share — paths from public/icons/share-apple-svgrepo-com.svg */
function AppleShareIcon() {
  return (
    <svg
      className="share-apple-icon"
      viewBox="0 0 50 50"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        fill="currentColor"
        d="M30.3 13.7L25 8.4l-5.3 5.3-1.4-1.4L25 5.6l6.7 6.7z"
      />
      <path fill="currentColor" d="M24 7h2v21h-2z" />
      <path
        fill="currentColor"
        d="M35 40H15c-1.7 0-3-1.3-3-3V19c0-1.7 1.3-3 3-3h7v2h-7c-.6 0-1 .4-1 1v18c0 .6.4 1 1 1h20c.6 0 1-.4 1-1V19c0-.6-.4-1-1-1h-7v-2h7c1.7 0 3 1.3 3 3v18c0 1.7-1.3 3-3 3z"
      />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}
