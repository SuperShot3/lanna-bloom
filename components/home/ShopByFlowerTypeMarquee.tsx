'use client';

import { useCallback, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { HomeFlowerTypeTile } from '@/lib/catalog/homeFlowerTypeTiles';
import {
  catalogImageUnoptimized,
  HOME_FLOWER_TYPE_TILE_IMAGE_SIZES,
} from '@/lib/catalog/catalogImage';

const LOOP_MS = 40_000;
const DRAG_THRESHOLD_PX = 8;
const RESUME_MS = 1_600;

export type FlowerTypeMarqueeItem = HomeFlowerTypeTile & {
  label: string;
  href: string;
  /** Defaults to square. Occasion posters are 3:4. */
  imageAspectClass?: string;
};

function FlowerTypeTileLink({
  item,
  duplicate,
}: {
  item: FlowerTypeMarqueeItem;
  duplicate?: boolean;
}) {
  return (
    <Link
      href={item.href}
      tabIndex={duplicate ? -1 : undefined}
      draggable={false}
      className="flower-type-marquee__tile group flex flex-col items-center text-center gap-2 rounded-2xl outline-none transition-transform duration-300 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-[#C5A059] focus-visible:ring-offset-2"
    >
      <div
        className={`relative ${item.imageAspectClass ?? 'aspect-square'} w-full overflow-hidden rounded-2xl bg-stone-100 ring-1 ring-stone-200/80 transition-all duration-300 group-hover:ring-[#C5A059]/60`}
      >
        <Image
          src={item.imageUrl}
          alt={duplicate ? '' : item.label}
          fill
          sizes={HOME_FLOWER_TYPE_TILE_IMAGE_SIZES}
          draggable={false}
          className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          unoptimized={catalogImageUnoptimized(item.imageUrl)}
        />
      </div>
      <span className="min-w-0 w-full truncate text-xs sm:text-sm font-medium text-[#1A3C34] transition-colors duration-300 group-hover:text-[#C5A059]">
        {item.label}
      </span>
    </Link>
  );
}

export function ShopByFlowerTypeMarquee({
  items,
  regionLabel,
}: {
  items: FlowerTypeMarqueeItem[];
  regionLabel: string;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(false);
  const draggingRef = useRef(false);
  const movedRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragStartScrollRef = useRef(0);
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearResume = useCallback(() => {
    if (resumeTimerRef.current) {
      clearTimeout(resumeTimerRef.current);
      resumeTimerRef.current = null;
    }
  }, []);

  const pause = useCallback(() => {
    pausedRef.current = true;
    clearResume();
  }, [clearResume]);

  const resumeSoon = useCallback(() => {
    clearResume();
    resumeTimerRef.current = setTimeout(() => {
      pausedRef.current = false;
      resumeTimerRef.current = null;
    }, RESUME_MS);
  }, [clearResume]);

  const wrapScroll = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const half = el.scrollWidth / 2;
    if (half <= 0) return;
    if (el.scrollLeft >= half) el.scrollLeft -= half;
    else if (el.scrollLeft < 0) el.scrollLeft += half;
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) return;

    let raf = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(now - last, 48);
      last = now;
      if (!pausedRef.current) {
        const half = el.scrollWidth / 2;
        if (half > el.clientWidth) {
          el.scrollLeft += (half / LOOP_MS) * dt;
          wrapScroll();
        }
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);

    const onWheel = (event: WheelEvent) => {
      pause();
      if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
        el.scrollLeft += event.deltaY;
        event.preventDefault();
        wrapScroll();
      }
      resumeSoon();
    };

    const onScroll = () => {
      if (draggingRef.current) return;
      wrapScroll();
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('scroll', onScroll);
      clearResume();
    };
  }, [clearResume, pause, resumeSoon, wrapScroll]);

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'mouse' && event.pointerType !== 'pen') {
      pause();
      return;
    }
    const el = scrollerRef.current;
    if (!el) return;
    pause();
    draggingRef.current = true;
    movedRef.current = false;
    dragStartXRef.current = event.clientX;
    dragStartScrollRef.current = el.scrollLeft;
    el.classList.add('is-dragging');
    el.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    const el = scrollerRef.current;
    if (!el) return;
    const dx = event.clientX - dragStartXRef.current;
    if (Math.abs(dx) > DRAG_THRESHOLD_PX) movedRef.current = true;
    let next = dragStartScrollRef.current - dx;
    const half = el.scrollWidth / 2;
    if (half > 0) {
      while (next >= half) next -= half;
      while (next < 0) next += half;
    }
    el.scrollLeft = next;
  };

  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const el = scrollerRef.current;
    if (draggingRef.current && el?.hasPointerCapture(event.pointerId)) {
      el.releasePointerCapture(event.pointerId);
    }
    draggingRef.current = false;
    el?.classList.remove('is-dragging');
    resumeSoon();
  };

  const onClickCapture = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!movedRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    movedRef.current = false;
  };

  const tileGroup = (duplicate: boolean) =>
    items.map((item) => (
      <FlowerTypeTileLink
        key={`${item.type}${duplicate ? '-dup' : ''}`}
        item={item}
        duplicate={duplicate}
      />
    ));

  return (
    <div
      ref={scrollerRef}
      className="flower-type-marquee -mx-4 sm:-mx-6 lg:-mx-8"
      role="region"
      aria-label={regionLabel}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onPointerLeave={() => {
        if (!draggingRef.current) resumeSoon();
      }}
      onPointerEnter={pause}
      onTouchStart={pause}
      onTouchEnd={resumeSoon}
      onFocusCapture={pause}
      onBlurCapture={resumeSoon}
      onClickCapture={onClickCapture}
    >
      <div className="flower-type-marquee__track">
        <div className="flower-type-marquee__group">{tileGroup(false)}</div>
        <div className="flower-type-marquee__group flower-type-marquee__dup" aria-hidden="true">
          {tileGroup(true)}
        </div>
      </div>
    </div>
  );
}
