'use client';

import { useCallback, useEffect, useState } from 'react';
import { ChevronUp } from 'lucide-react';
import { translations, type Locale } from '@/lib/i18n';
import { trackCtaClick } from '@/lib/analytics';

/** Show when the viewport bottom is within this distance of the page end. */
const BOTTOM_THRESHOLD_PX = 160;

function isNearPageBottom(): boolean {
  const scrollBottom = window.scrollY + window.innerHeight;
  const docHeight = document.documentElement.scrollHeight;
  return scrollBottom >= docHeight - BOTTOM_THRESHOLD_PX;
}

export function BackToTopButton({ lang }: { lang: Locale }) {
  const [visible, setVisible] = useState(false);
  const label = translations[lang].home.backToTop;

  useEffect(() => {
    const sync = () => {
      setVisible(isNearPageBottom());
    };

    sync();
    window.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('resize', sync);
    return () => {
      window.removeEventListener('scroll', sync);
      window.removeEventListener('resize', sync);
    };
  }, []);

  const scrollToTop = useCallback(() => {
    trackCtaClick('cta_back_to_top');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label={label}
      className={`
        relative inline-flex items-center justify-center
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
