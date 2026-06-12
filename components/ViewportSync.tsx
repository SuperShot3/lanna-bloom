'use client';

import { useEffect } from 'react';

/**
 * Syncs visual viewport (offset and size) to CSS custom properties on :root.
 * Used to fix iOS Safari pinch-zoom drift for fixed/sticky header elements.
 */
export function ViewportSync() {
  useEffect(() => {
    const vv = typeof window !== 'undefined' ? window.visualViewport : null;
    if (!vv) return;

    let rafId: number | null = null;

    const update = () => {
      rafId = null;
      const doc = document.documentElement;
      doc.style.setProperty('--visual-viewport-offset-left', `${vv.offsetLeft}px`);
      doc.style.setProperty('--visual-viewport-offset-top', `${vv.offsetTop}px`);
      doc.style.setProperty('--visual-viewport-width', `${vv.width}px`);
      doc.style.setProperty('--visual-viewport-height', `${vv.height}px`);
      doc.style.setProperty('--vh', `${vv.height * 0.01}px`);
    };

    const schedule = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(update);
    };

    update();
    vv.addEventListener('resize', schedule);
    vv.addEventListener('scroll', schedule);
    window.addEventListener('resize', schedule);

    return () => {
      vv.removeEventListener('resize', schedule);
      vv.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, []);

  return null;
}
