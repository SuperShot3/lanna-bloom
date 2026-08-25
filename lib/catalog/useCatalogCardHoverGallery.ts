'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CATALOG_CARD_HOVER_GALLERY_MS,
  catalogCardHoverStartIndex,
} from '@/lib/catalog/catalogCardHoverGallery';
import { preloadCatalogImage } from '@/lib/catalog/catalogImage';

/** Card-sized preload; `384` is in next.config `imageSizes`. */
const CATALOG_CARD_HOVER_PRELOAD_WIDTH = 384;

function useMatchMedia(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(query);
    const update = () => setMatches(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, [query]);

  return matches;
}

export function useCatalogCardHoverGallery({
  enabled,
  playlist,
  restSrc,
}: {
  enabled: boolean;
  playlist: readonly string[];
  restSrc: string;
}) {
  const prefersReducedMotion = useMatchMedia('(prefers-reduced-motion: reduce)');
  const isFineHover = useMatchMedia('(hover: hover) and (pointer: fine)');
  const [hovered, setHovered] = useState(false);
  const [cycleIndex, setCycleIndex] = useState(0);

  const playlistRef = useRef(playlist);
  playlistRef.current = playlist;
  const restSrcRef = useRef(restSrc);
  restSrcRef.current = restSrc;

  const playlistKey = playlist.join('\n');
  const startIndex = catalogCardHoverStartIndex(playlist, restSrc);
  const canShowDesktopDots = enabled && isFineHover && playlist.length > 1;
  const canCycle = canShowDesktopDots && !prefersReducedMotion;
  const cycling = canCycle && hovered;
  const disableMouseDrag = canCycle;

  const displaySrc = cycling ? playlist[cycleIndex] || restSrc : restSrc;
  const displayIndex = cycling ? cycleIndex : startIndex;

  const snapToRest = useCallback(() => {
    setCycleIndex(catalogCardHoverStartIndex(playlistRef.current, restSrcRef.current));
  }, []);

  useEffect(() => {
    if (!hovered) return;
    snapToRest();
  }, [hovered, playlistKey, restSrc, snapToRest]);

  useEffect(() => {
    const slides = playlistRef.current;
    if (!cycling || slides.length < 2) return;
    const timer = window.setInterval(() => {
      setCycleIndex((index) => (index + 1) % playlistRef.current.length);
    }, CATALOG_CARD_HOVER_GALLERY_MS);
    return () => window.clearInterval(timer);
  }, [cycling, cycleIndex, playlistKey]);

  useEffect(() => {
    const slides = playlistRef.current;
    if (!cycling || slides.length < 2) return;
    const next = slides[(cycleIndex + 1) % slides.length];
    if (next) preloadCatalogImage(next, CATALOG_CARD_HOVER_PRELOAD_WIDTH);
  }, [cycling, cycleIndex, playlistKey]);

  const onEnter = useCallback(() => {
    if (!enabled) return;
    snapToRest();
    setHovered(true);
  }, [enabled, snapToRest]);

  const onLeave = useCallback(() => {
    setHovered(false);
    snapToRest();
  }, [snapToRest]);

  return useMemo(
    () => ({
      displaySrc,
      displayIndex,
      cycling,
      canCycle,
      canShowDesktopDots,
      disableMouseDrag,
      isFineHover,
      progressMs: CATALOG_CARD_HOVER_GALLERY_MS,
      onEnter,
      onLeave,
    }),
    [
      canCycle,
      canShowDesktopDots,
      cycling,
      disableMouseDrag,
      displayIndex,
      displaySrc,
      isFineHover,
      onEnter,
      onLeave,
    ]
  );
}
