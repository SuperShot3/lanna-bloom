'use client';

import { useCallback, useEffect, useState } from 'react';
import { ChevronUp } from 'lucide-react';
import { translations, type Locale } from '@/lib/i18n';
import { trackCtaClick } from '@/lib/analytics';

/** Trigger earlier on long feeds, not only right at footer. */
const SHOW_AFTER_SCROLL_PROGRESS = 0.55;
const BOTTOM_THRESHOLD_MOBILE_PX = 720;
const BOTTOM_THRESHOLD_DESKTOP_PX = 520;
const MIN_SCROLL_BEFORE_SHOW_PX = 280;

function getViewportHeight(): number {
  return window.visualViewport?.height ?? window.innerHeight;
}

function getScrollTop(): number {
  return window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
}

function getDocumentHeight(): number {
  return Math.max(
    document.body.scrollHeight,
    document.documentElement.scrollHeight,
    document.body.offsetHeight,
    document.documentElement.offsetHeight,
  );
}

function shouldShowBackToTop(): boolean {
  const scrollTop = getScrollTop();
  const viewportHeight = getViewportHeight();
  const docHeight = getDocumentHeight();

  if (scrollTop <= MIN_SCROLL_BEFORE_SHOW_PX) return false;

  const maxScrollable = Math.max(1, docHeight - viewportHeight);
  const scrollProgress = scrollTop / maxScrollable;
  const threshold =
    viewportHeight < 768 ? BOTTOM_THRESHOLD_MOBILE_PX : BOTTOM_THRESHOLD_DESKTOP_PX;

  const nearBottom = scrollTop + viewportHeight >= docHeight - threshold;
  const crossedProgressThreshold = scrollProgress >= SHOW_AFTER_SCROLL_PROGRESS;
  return nearBottom || crossedProgressThreshold;
}

export function BackToTopButton({
  lang,
  showContactButtons = true,
}: {
  lang: Locale;
  showContactButtons?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  const label = translations[lang].home.backToTop;

  useEffect(() => {
    const sync = () => {
      setVisible(shouldShowBackToTop());
    };

    sync();

    window.addEventListener('scroll', sync, { passive: true });
    window.visualViewport?.addEventListener('resize', sync);
    window.visualViewport?.addEventListener('scroll', sync);
    window.addEventListener('resize', sync);

    return () => {
      window.removeEventListener('scroll', sync);
      window.visualViewport?.removeEventListener('resize', sync);
      window.visualViewport?.removeEventListener('scroll', sync);
      window.removeEventListener('resize', sync);
    };
  }, []);

  const scrollToTop = useCallback(() => {
    trackCtaClick('cta_back_to_top');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  if (!visible) return null;

  const bottomClass = showContactButtons
    ? 'bottom-[calc(6rem+7.5rem+env(safe-area-inset-bottom,0px))] md:bottom-[calc(1.5rem+8.25rem+env(safe-area-inset-bottom,0px))]'
    : 'bottom-[calc(6rem+env(safe-area-inset-bottom,0px))] md:bottom-6';

  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label={label}
      className={`
        back-to-top-floating ${showContactButtons ? '' : 'back-to-top-floating--solo'} fixed right-4 z-[112] md:right-6 ${bottomClass}
        inline-flex items-center justify-center
        rounded-full overflow-hidden
        ring-1 ring-black/10
        shadow-[0_14px_26px_rgba(0,0,0,0.22),0_3px_0_rgba(0,0,0,0.12)]
        after:content-[''] after:absolute after:inset-[2px] after:rounded-full after:pointer-events-none
        after:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.22),inset_0_-10px_18px_rgba(0,0,0,0.16)]
        transition-[opacity,visibility,transform,box-shadow] duration-200 ease-out
        before:content-[''] before:absolute before:inset-0 before:rounded-full before:bg-white/20
        before:scale-0 before:opacity-0 before:transition before:duration-300
        hover:scale-[1.06] hover:shadow-[0_18px_34px_rgba(0,0,0,0.24),0_3px_0_rgba(0,0,0,0.12)]
        hover:before:scale-[1.8] hover:before:opacity-100
        focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--accent)]/30
        active:scale-[0.95] active:translate-y-[1px]
        active:shadow-[0_10px_20px_rgba(0,0,0,0.20),0_1px_0_rgba(0,0,0,0.10)]
        h-12 w-12 sm:h-[52px] sm:w-[52px] md:h-14 md:w-14
        border-2 border-[var(--border)] bg-[var(--surface)] text-[var(--accent)]
      `}
    >
      <ChevronUp className="relative h-6 w-6" strokeWidth={2.25} aria-hidden />
    </button>
  );
}
