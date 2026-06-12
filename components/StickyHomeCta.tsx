'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Locale } from '@/lib/i18n';
import { translations } from '@/lib/i18n';
import { trackCtaClick } from '@/lib/analytics';

const HERO_SENTINEL_ID = 'hero-sentinel';
const SCROLL_THRESHOLD_BACK_TO_TOP = 600;

function isHomePath(pathname: string | null): boolean {
  if (!pathname) return false;
  return pathname === '/en' || pathname === '/th' || pathname === '/';
}

export function StickyHomeCta({ lang }: { lang: Locale }) {
  const pathname = usePathname();
  const [stickyVisible, setStickyVisible] = useState(false);
  const [backToTopVisible, setBackToTopVisible] = useState(false);

  const catalogHref = `/${lang}/catalog`;
  const t = translations[lang].home;

  useEffect(() => {
    if (!isHomePath(pathname)) return;

    const sentinel = document.getElementById(HERO_SENTINEL_ID);
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setStickyVisible(!entry.isIntersecting);
      },
      { threshold: 0, rootMargin: '0px 0px 0px 0px' }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [pathname]);

  useEffect(() => {
    if (!isHomePath(pathname)) return;

    const checkScroll = () => {
      setBackToTopVisible(window.scrollY > SCROLL_THRESHOLD_BACK_TO_TOP);
    };
    checkScroll();
    window.addEventListener('scroll', checkScroll, { passive: true });
    return () => window.removeEventListener('scroll', checkScroll);
  }, [pathname]);

  const scrollToTop = useCallback(() => {
    trackCtaClick('cta_home_back_to_top');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  if (!isHomePath(pathname)) return null;

  return (
    <>
      <div
        className={`sticky-home-cta ${stickyVisible ? 'sticky-home-cta--visible' : ''}`}
        aria-hidden={!stickyVisible}
      >
        <div className="sticky-home-cta-inner">
          <Link
            href={catalogHref}
            className="sticky-home-cta-btn"
            onClick={() => trackCtaClick('cta_home_sticky_browse')}
          >
            {t.browseBouquets}
          </Link>
        </div>
      </div>
      <button
        type="button"
        className={`back-to-top ${backToTopVisible ? 'back-to-top--visible' : ''}`}
        onClick={scrollToTop}
        aria-label={t.backToTop}
        aria-hidden={!backToTopVisible}
      >
        <span aria-hidden>↑</span>
      </button>
      <style jsx>{`
        .sticky-home-cta {
          display: none;
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          z-index: 90;
          padding: 12px 20px;
          padding-bottom: calc(12px + env(safe-area-inset-bottom));
          background: var(--surface);
          border-top: 1px solid var(--border);
          box-shadow: 0 -4px 20px rgba(45, 42, 38, 0.08);
          transform: translateY(100%);
          transition: transform 0.25s ease-out;
        }
        .sticky-home-cta--visible {
          transform: translateY(0);
        }
        .sticky-home-cta-inner {
          max-width: 400px;
          margin: 0 auto;
        }
        .sticky-home-cta-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          min-height: 48px;
          padding: 12px 24px;
          background: var(--accent);
          color: #fff;
          font-weight: 700;
          font-size: 1rem;
          border-radius: 9999px;
          border: 2px solid #a88b5c;
          box-shadow: 0 4px 0 #a88b5c;
          text-decoration: none;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .sticky-home-cta-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 0 #a88b5c;
        }
        .sticky-home-cta-btn:active {
          transform: translateY(1px);
        }
        .sticky-home-cta-btn:focus-visible {
          outline: 3px solid var(--text);
          outline-offset: 2px;
        }
        @media (min-width: 601px) {
          .sticky-home-cta {
            display: none !important;
          }
        }
        @media (max-width: 600px) {
          .sticky-home-cta {
            display: block;
          }
        }

        .back-to-top {
          position: fixed;
          bottom: calc(80px + env(safe-area-inset-bottom));
          right: 20px;
          z-index: 89;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          border: 2px solid var(--border);
          background: var(--surface);
          color: var(--accent);
          font-size: 20px;
          cursor: pointer;
          box-shadow: var(--shadow);
          opacity: 0;
          visibility: hidden;
          transform: scale(0.9);
          transition: opacity 0.2s, visibility 0.2s, transform 0.2s;
        }
        .back-to-top--visible {
          opacity: 1;
          visibility: visible;
          transform: scale(1);
        }
        .back-to-top:hover {
          background: var(--accent-soft);
          border-color: var(--accent);
        }
        .back-to-top:focus-visible {
          outline: 3px solid var(--accent);
          outline-offset: 2px;
        }
        @media (min-width: 601px) {
          .back-to-top {
            bottom: 24px;
            right: 24px;
          }
        }
      `}</style>
    </>
  );
}
