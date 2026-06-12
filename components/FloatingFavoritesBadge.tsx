'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getFavoritesCount, FAVORITES_STORAGE_KEY } from '@/lib/favorites';

function readCount() {
  try {
    return getFavoritesCount();
  } catch {
    return 0;
  }
}

export function FloatingFavoritesBadge({ lang }: { lang: string }) {
  const router = useRouter();
  const pathname = usePathname() ?? '';
  const [count, setCount] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [pulse, setPulse] = useState(false);
  const lastCountRef = useRef<number | null>(null);
  const pulseTimerRef = useRef<number | null>(null);

  const favoritesHref = useMemo(() => `/${lang}/favorites`, [lang]);
  const cartHref = useMemo(() => `/${lang}/cart`, [lang]);
  const shouldHide = pathname === favoritesHref || pathname === `${favoritesHref}/` || pathname === cartHref || pathname === `${cartHref}/`;

  useEffect(() => {
    const sync = () => {
      const nextCount = readCount();
      const prevCount = lastCountRef.current;
      lastCountRef.current = nextCount;
      setCount(nextCount);

      setIsVisible(nextCount > 0);

      // Pulse gently only when the count changes (skip first hydration pulse).
      if (prevCount != null && prevCount !== nextCount) {
        setPulse(true);
        if (pulseTimerRef.current) window.clearTimeout(pulseTimerRef.current);
        pulseTimerRef.current = window.setTimeout(() => setPulse(false), 520);
      }
    };

    // Initial load from sessionStorage.
    sync();

    const onFavoritesUpdated = () => sync();
    window.addEventListener('favorites-updated', onFavoritesUpdated as EventListener);

    // Cross-tab sync (where supported).
    const onStorage = (e: StorageEvent) => {
      if (e.key && e.key === FAVORITES_STORAGE_KEY) sync();
    };
    window.addEventListener('storage', onStorage);

    return () => {
      window.removeEventListener('favorites-updated', onFavoritesUpdated as EventListener);
      window.removeEventListener('storage', onStorage);
      if (pulseTimerRef.current) window.clearTimeout(pulseTimerRef.current);
    };
  }, []);

  if (shouldHide) return null;

  return (
    <div className="favorites-badge-fixed">
      <button
        type="button"
        className={[
          'favorites-badge',
          isVisible ? 'favorites-badge--visible' : 'favorites-badge--hidden',
          pulse ? 'favorites-badge--pulse' : '',
        ].join(' ')}
        onClick={() => router.push(favoritesHref)}
        aria-label={`View favorites (${count})`}
      >
        <span className="material-symbols-outlined material-symbols-filled favorites-badge-heart" aria-hidden>
          favorite
        </span>
        <span className="favorites-badge-count" aria-hidden>
          {count}
        </span>
      </button>

      <style jsx>{`
        .favorites-badge-fixed {
          position: fixed;
          right: 16px;
          top: calc(136px + env(safe-area-inset-top,0px));
          z-index: 98;
          pointer-events: none; /* enable only on the button */
        }
        @media (max-width: 640px) {
          .favorites-badge-fixed {
            right: 12px;
          }
        }
        .favorites-badge {
          pointer-events: auto;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          border-radius: 9999px;
          padding: 10px 14px;
          border: 1px solid rgba(26, 60, 52, 0.16);
          background: rgba(253, 252, 248, 0.92);
          box-shadow: 0 14px 30px rgba(0, 0, 0, 0.08);
          color: #1a3c34;

          opacity: 0;
          transition: opacity 0.3s ease;
          transform: translateX(90px);
          transition-property: opacity, transform;
          transition-duration: 0.3s, 0.3s;
          transition-timing-function: ease, ease;
        }
        .favorites-badge--visible {
          opacity: 1;
          transform: translateX(0);
        }
        .favorites-badge--hidden {
          opacity: 0;
          transform: translateX(90px);
        }
        .favorites-badge-heart {
          color: #e11d48;
          font-size: 18px;
          line-height: 1;
        }
        .favorites-badge-count {
          min-width: 18px;
          height: 18px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 800;
          background: rgba(225, 29, 72, 0.12);
          color: #e11d48;
          border-radius: 999px;
          padding: 0 6px;
        }
        .favorites-badge--pulse .favorites-badge-heart {
          animation: favoritesPulse 520ms ease-out;
        }
        @keyframes favoritesPulse {
          0% {
            transform: scale(1);
          }
          45% {
            transform: scale(1.18);
          }
          100% {
            transform: scale(1);
          }
        }

        .favorites-badge:focus-visible {
          outline: 2px solid var(--accent);
          outline-offset: 3px;
        }
        .favorites-badge:active {
          transform: translateX(0) translateY(0) scale(0.98);
        }
      `}</style>
    </div>
  );
}

