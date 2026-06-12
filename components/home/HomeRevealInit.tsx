'use client';

import { useLayoutEffect } from 'react';

const REVEAL_SELECTOR = '[data-home-reveal]';
const ROOT_MARGIN = '48px 0px -6% 0px';
const THRESHOLD = 0.06;

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function revealSection(el: Element) {
  el.classList.add('is-revealed');
}

function isNearViewport(el: Element): boolean {
  const rect = el.getBoundingClientRect();
  const vh = window.innerHeight || document.documentElement.clientHeight;
  return rect.top < vh && rect.bottom > 0;
}

/**
 * Observes homepage sections and toggles `.is-revealed` once when they enter view.
 * Adds `home-reveal-ready` on <html> so unrevealed sections can animate from CSS only.
 */
export function HomeRevealInit() {
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.classList.add('home-reveal-ready');

    const sections = Array.from(document.querySelectorAll(REVEAL_SELECTOR));
    if (sections.length === 0) {
      return () => root.classList.remove('home-reveal-ready');
    }

    if (prefersReducedMotion()) {
      sections.forEach(revealSection);
      return () => root.classList.remove('home-reveal-ready');
    }

    sections.forEach((el) => {
      if (isNearViewport(el)) revealSection(el);
    });

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          revealSection(entry.target);
          observer.unobserve(entry.target);
        }
      },
      { root: null, rootMargin: ROOT_MARGIN, threshold: THRESHOLD }
    );

    sections.forEach((el) => {
      if (!el.classList.contains('is-revealed')) observer.observe(el);
    });

    return () => {
      observer.disconnect();
      root.classList.remove('home-reveal-ready');
    };
  }, []);

  return null;
}
