'use client';

import { useCallback, useEffect, useState } from 'react';
import { ChevronUp } from 'lucide-react';
import { useFlowerFilterSheetOpen } from '@/contexts/FlowerFilterSheetOpenContext';
import { translations, type Locale } from '@/lib/i18n';
import { trackCtaClick } from '@/lib/analytics';

const DESKTOP_MIN_WIDTH = 768;
/** Show when the viewport bottom is within this distance of the page end. */
const BOTTOM_THRESHOLD_PX = 160;

function isNearPageBottom(): boolean {
  const scrollBottom = window.scrollY + window.innerHeight;
  const docHeight = document.documentElement.scrollHeight;
  return scrollBottom >= docHeight - BOTTOM_THRESHOLD_PX;
}

export function BackToTopButton({ lang }: { lang: Locale }) {
  const { isOpen: flowerFilterSheetOpen } = useFlowerFilterSheetOpen();
  const [visible, setVisible] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const label = translations[lang].home.backToTop;

  useEffect(() => {
    const sync = () => {
      const desktop = window.innerWidth >= DESKTOP_MIN_WIDTH;
      setIsDesktop(desktop);
      setVisible(desktop && isNearPageBottom());
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

  if (!isDesktop || flowerFilterSheetOpen) return null;

  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label={label}
      aria-hidden={!visible}
      className={`
        fixed left-6 bottom-6 z-[100] hidden md:inline-flex
        h-12 w-12 items-center justify-center rounded-full
        border-2 border-[var(--border)] bg-[var(--surface)] text-[var(--accent)]
        shadow-[var(--shadow)]
        transition-[opacity,visibility,transform] duration-200 ease-out
        hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]
        focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--accent)]/30
        active:scale-95
        ${visible ? 'visible scale-100 opacity-100' : 'invisible scale-90 opacity-0 pointer-events-none'}
      `}
    >
      <ChevronUp className="h-6 w-6" strokeWidth={2.25} aria-hidden />
    </button>
  );
}
