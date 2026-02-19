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
  /** Optional className for styling */
  className?: string;
  /** Compact variant for card footer */
  variant?: 'default' | 'compact';
}

export function ShareButton({
  url,
  title,
  text,
  showFacebook = false,
  ariaLabel = 'Share',
  className = '',
  variant = 'default',
}: ShareButtonProps) {
  const { showToast } = useToast();

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title,
          text: text ?? title,
          url,
        });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          await copyToClipboard(url);
        }
      }
    } else {
      await copyToClipboard(url);
    }
  };

  const copyToClipboard = async (urlToCopy: string) => {
    try {
      await navigator.clipboard.writeText(urlToCopy);
      showToast('Link copied');
    } catch {
      showToast('Could not copy link');
    }
  };

  const handleFacebookShare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
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
        <ShareIcon />
        <span className="share-button-text">Share</span>
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
          display: none;
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
