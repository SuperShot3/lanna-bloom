'use client';

import { useCallback, useState } from 'react';
import type { CartItem } from '@/contexts/CartContext';
import { useToast } from '@/contexts/ToastContext';
import type { Locale } from '@/lib/i18n';
import { translations } from '@/lib/i18n';

export function CartShareButton({
  items,
  lang,
}: {
  items: CartItem[];
  lang: Locale;
}) {
  const { showToast } = useToast();
  const t = translations[lang].cart;
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const shareOrCopy = useCallback(
    async (url: string) => {
      if (typeof navigator !== 'undefined' && navigator.share) {
        try {
          await navigator.share({
            title: t.shareCart,
            text: t.shareCart,
            url,
          });
          return;
        } catch (err) {
          if ((err as Error).name === 'AbortError') return;
        }
      }

      try {
        await navigator.clipboard.writeText(url);
        showToast(t.shareCartLinkCopied);
      } catch {
        showToast(t.shareCartFailed);
      }
    },
    [showToast, t.shareCart, t.shareCartFailed, t.shareCartLinkCopied]
  );

  const handleClick = async () => {
    if (loading) return;

    if (shareUrl) {
      await shareOrCopy(shareUrl);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/cart/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, locale: lang }),
      });
      if (!res.ok) {
        showToast(t.shareCartFailed);
        return;
      }
      const data = (await res.json()) as { url?: string };
      const url = typeof data.url === 'string' ? data.url : '';
      if (!url) {
        showToast(t.shareCartFailed);
        return;
      }
      setShareUrl(url);
      await shareOrCopy(url);
    } catch {
      showToast(t.shareCartFailed);
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0) return null;

  const label = loading ? t.shareCartCreating : t.shareCart;

  return (
    <button
      type="button"
      className="cart-share-btn"
      onClick={handleClick}
      disabled={loading}
      aria-busy={loading}
      aria-label={t.shareCart}
      title={t.shareCart}
    >
      <span className={`cart-share-btn-icon${loading ? ' cart-share-btn-icon--loading' : ''}`} aria-hidden>
        <ShareIcon />
      </span>
      <span className="cart-share-btn-label">{label}</span>
      <style jsx>{`
        .cart-share-btn {
          display: inline-flex;
          flex-direction: row;
          align-items: center;
          justify-content: center;
          gap: 0.35rem;
          min-height: 36px;
          padding: 6px 12px;
          margin: 0;
          box-sizing: border-box;
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          background: #fff;
          color: var(--text);
          cursor: pointer;
          transition:
            background 0.2s,
            border-color 0.2s,
            color 0.2s;
        }
        .cart-share-btn:hover:not(:disabled),
        .cart-share-btn:focus-visible:not(:disabled) {
          background: color-mix(in srgb, var(--pastel-cream) 70%, #fff);
          border-color: color-mix(in srgb, var(--accent) 35%, var(--border));
          color: var(--text);
        }
        .cart-share-btn:focus-visible {
          outline: 2px solid var(--accent);
          outline-offset: 2px;
        }
        .cart-share-btn:disabled {
          opacity: 0.65;
          cursor: wait;
        }
        .cart-share-btn-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 16px;
          height: 16px;
          flex-shrink: 0;
          color: var(--text-muted);
        }
        .cart-share-btn-icon--loading {
          opacity: 0.45;
        }
        .cart-share-btn-label {
          font-size: 0.8125rem;
          font-weight: 550;
          line-height: 1.2;
          white-space: nowrap;
        }
      `}</style>
    </button>
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
    >
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  );
}
