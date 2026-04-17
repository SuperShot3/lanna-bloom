'use client';

import { useRef, useState } from 'react';
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from 'framer-motion';
import Image from 'next/image';

const FALLBACK_CARDS = [
  { id: 1, src: 'https://images.unsplash.com/photo-1563241527-3004b7becc23?auto=format&fit=crop&q=80&w=800&h=1000' },
  { id: 2, src: 'https://images.unsplash.com/photo-1561181286-d3fee7d55ef6?auto=format&fit=crop&q=80&w=800&h=1000' },
  { id: 3, src: 'https://images.unsplash.com/photo-1526047932273-341f2a7631f9?auto=format&fit=crop&q=80&w=800&h=1000' },
  { id: 4, src: 'https://images.unsplash.com/photo-1562690868-60bbe7293e94?auto=format&fit=crop&q=80&w=800&h=1000' },
  { id: 5, src: 'https://images.unsplash.com/photo-1490750967868-88cb4ec0f07c?auto=format&fit=crop&q=80&w=800&h=1000' },
];

type HeroCard = {
  id: number;
  src: string;
};

type SwipeDirection = 'left' | 'right';

type OutgoingCard = {
  id: string;
  card: HeroCard;
  startX: number;
  startRotate: number;
  direction: SwipeDirection;
};

const SWIPE_THRESHOLD = 88;
const VELOCITY_THRESHOLD = 520;
const SWIPE_OUT_X = 880;
const SWIPE_OUT_ROTATE = 7;

const SWIPE_OUT_TRANSITION = {
  duration: 0.78,
  ease: [0.22, 0.9, 0.28, 1],
} as const;

const STACK_TRANSITION = {
  type: 'spring' as const,
  stiffness: 118,
  damping: 30,
  mass: 1.08,
};

const SNAP_BACK_TRANSITION = {
  type: 'spring' as const,
  stiffness: 165,
  damping: 32,
  mass: 1.05,
};

const BUTTON_SWIPE_OFFSET = 40;
const COMMIT_DEBOUNCE_MS = 320;

function cycleForward(cards: HeroCard[]) {
  if (cards.length <= 1) return cards;
  const [first, ...rest] = cards;
  return [...rest, first];
}

function cycleBackward(cards: HeroCard[]) {
  if (cards.length <= 1) return cards;
  const last = cards[cards.length - 1];
  return [last, ...cards.slice(0, -1)];
}

function getCardLayout(index: number) {
  if (index === 0) {
    return { scale: 1, y: 0, opacity: 1 };
  }

  if (index === 1) {
    return { scale: 0.965, y: 16, opacity: 0.82 };
  }

  return { scale: 0.93, y: 32, opacity: 0.58 };
}

export function HeroSwipeCards({ initialHeroImage, carouselImages }: { initialHeroImage?: string; carouselImages?: string[] }) {
  const sourceImages = carouselImages && carouselImages.length > 0
    ? carouselImages
    : FALLBACK_CARDS.map((card) => card.src);

  const [cards, setCards] = useState(() => sourceImages.map((src, index) => ({ id: index, src })));
  const [outgoingCards, setOutgoingCards] = useState<OutgoingCard[]>([]);
  const swipeSequenceRef = useRef(0);
  const commitLockUntilRef = useRef(0);
  const prefersReducedMotion = useReducedMotion();

  const x = useMotionValue(0);
  const rotate = useTransform(x, [-260, 260], [-8, 8]);
  const nextHintOpacity = useTransform(x, [12, 72], [0, 1]);
  const prevHintOpacity = useTransform(x, [-72, -12], [1, 0]);

  const visibleCards = cards.slice(0, 3);
  const activeCard = visibleCards[0];
  const canSwipe = cards.length > 1;

  const finishSwipe = (outgoingId: string) => {
    setOutgoingCards((prev) => prev.filter((card) => card.id !== outgoingId));
  };

  const tryCommit = (direction: SwipeDirection, startX: number) => {
    if (!canSwipe || !activeCard) return;
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (now < commitLockUntilRef.current) return;

    commitLockUntilRef.current = now + COMMIT_DEBOUNCE_MS;
    swipeSequenceRef.current += 1;

    const clampedRotate = Math.max(-SWIPE_OUT_ROTATE, Math.min(SWIPE_OUT_ROTATE, startX / 28));

    setOutgoingCards((prev) => [...prev, {
      id: `${activeCard.id}-${swipeSequenceRef.current}`,
      card: activeCard,
      startX,
      startRotate: clampedRotate,
      direction,
    }]);
    setCards((prev) => (direction === 'right' ? cycleForward(prev) : cycleBackward(prev)));
    x.set(0);
  };

  const handleButtonNext = () => {
    tryCommit('right', BUTTON_SWIPE_OFFSET);
  };

  const handleButtonPrev = () => {
    tryCommit('left', -BUTTON_SWIPE_OFFSET);
  };

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: { offset: { x: number }; velocity: { x: number } }) => {
    const currentX = x.get();
    const shouldNext =
      info.offset.x > SWIPE_THRESHOLD ||
      info.velocity.x > VELOCITY_THRESHOLD;
    const shouldPrev =
      info.offset.x < -SWIPE_THRESHOLD ||
      info.velocity.x < -VELOCITY_THRESHOLD;

    if (shouldNext && !shouldPrev) {
      tryCommit('right', currentX);
      return;
    }
    if (shouldPrev && !shouldNext) {
      tryCommit('left', currentX);
      return;
    }

    if (shouldNext && shouldPrev) {
      tryCommit(info.velocity.x >= 0 ? 'right' : 'left', currentX);
      return;
    }

    animate(x, 0, prefersReducedMotion ? { duration: 0.2 } : SNAP_BACK_TRANSITION);
  };

  if (!activeCard) return null;

  const exitTransition = prefersReducedMotion
    ? { duration: 0.22, ease: 'easeOut' as const }
    : SWIPE_OUT_TRANSITION;

  return (
    <div className="relative w-full h-full flex flex-col items-center">
      <div className="relative w-full aspect-[4/5]">
        {visibleCards.slice().reverse().map((card) => {
          const index = visibleCards.findIndex((visibleCard) => visibleCard.id === card.id);
          const layout = getCardLayout(index);
          const isTopCard = index === 0;

          return (
            <motion.div
              key={card.id}
              initial={false}
              animate={layout}
              transition={STACK_TRANSITION}
              style={isTopCard ? { x, rotate, willChange: 'transform' } : undefined}
              drag={isTopCard && canSwipe ? 'x' : false}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.14}
              dragMomentum={false}
              onDragEnd={isTopCard ? handleDragEnd : undefined}
              className="absolute inset-0 rounded-[2rem] overflow-hidden shadow-xl md:shadow-2xl"
            >
              <Image
                src={card.src}
                alt="Beautiful boutique floral arrangement"
                fill
                className="h-full w-full object-cover pointer-events-none"
                priority={index < 2}
                sizes="(max-width: 1024px) 100%, 50vw"
              />

              {isTopCard && canSwipe && (
                <>
                  <motion.div
                    style={{ opacity: nextHintOpacity }}
                    className="absolute inset-0 z-20 pointer-events-none flex items-center justify-center bg-gradient-to-l from-white/25 via-transparent to-transparent"
                  >
                    <div className="ml-auto mr-6 sm:mr-10 flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-white/85 text-[#1A3C34] shadow-md ring-1 ring-stone-200/80">
                      <span className="material-symbols-outlined text-3xl sm:text-4xl" aria-hidden>
                        arrow_forward
                      </span>
                    </div>
                  </motion.div>
                  <motion.div
                    style={{ opacity: prevHintOpacity }}
                    className="absolute inset-0 z-20 pointer-events-none flex items-center justify-center bg-gradient-to-r from-white/25 via-transparent to-transparent"
                  >
                    <div className="mr-auto ml-6 sm:ml-10 flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-white/85 text-[#1A3C34] shadow-md ring-1 ring-stone-200/80">
                      <span className="material-symbols-outlined text-3xl sm:text-4xl" aria-hidden>
                        arrow_back
                      </span>
                    </div>
                  </motion.div>
                </>
              )}
            </motion.div>
          );
        })}

        {outgoingCards.map((outgoingCard) => {
          const targetX = outgoingCard.direction === 'right' ? SWIPE_OUT_X : -SWIPE_OUT_X;
          const targetRotate = outgoingCard.direction === 'right' ? SWIPE_OUT_ROTATE : -SWIPE_OUT_ROTATE;

          return (
            <motion.div
              key={`outgoing-${outgoingCard.id}`}
              initial={{
                x: outgoingCard.startX,
                rotate: outgoingCard.startRotate,
                scale: 1,
                opacity: 1,
              }}
              animate={prefersReducedMotion
                ? { x: targetX * 0.35, rotate: targetRotate * 0.4, scale: 0.98, opacity: 0 }
                : {
                    x: targetX,
                    rotate: targetRotate,
                    scale: 0.975,
                    opacity: 0.12,
                  }}
              transition={exitTransition}
              onAnimationComplete={() => finishSwipe(outgoingCard.id)}
              className="absolute inset-0 z-20 rounded-[2rem] overflow-hidden shadow-xl md:shadow-2xl pointer-events-none"
            >
              <Image
                src={outgoingCard.card.src}
                alt="Beautiful boutique floral arrangement"
                fill
                className="h-full w-full object-cover"
                priority
                sizes="(max-width: 1024px) 100%, 50vw"
              />
            </motion.div>
          );
        })}
      </div>

      <div className="absolute bottom-5 sm:bottom-6 left-0 right-0 flex justify-center items-center gap-5 sm:gap-8 z-40 pointer-events-none px-4">
        <button
          type="button"
          onClick={handleButtonPrev}
          disabled={!canSwipe}
          className="w-14 h-14 sm:w-[4.25rem] sm:h-[4.25rem] rounded-full bg-white/95 text-[#1A3C34] shadow-[0_6px_24px_rgba(0,0,0,0.12)] flex items-center justify-center hover:scale-[1.04] hover:shadow-[0_10px_28px_rgba(0,0,0,0.14)] transition-all duration-300 ring-1 ring-stone-200/90 active:scale-[0.97] pointer-events-auto disabled:opacity-45 disabled:cursor-not-allowed disabled:scale-100 disabled:hover:shadow-[0_6px_24px_rgba(0,0,0,0.12)]"
          aria-label="Previous photo"
        >
          <span className="material-symbols-outlined text-3xl sm:text-4xl">arrow_back</span>
        </button>
        <button
          type="button"
          onClick={handleButtonNext}
          disabled={!canSwipe}
          className="w-14 h-14 sm:w-[4.25rem] sm:h-[4.25rem] rounded-full bg-[#1A3C34]/92 text-white shadow-[0_6px_24px_rgba(0,0,0,0.18)] flex items-center justify-center hover:scale-[1.04] hover:bg-[#1A3C34] hover:shadow-[0_10px_28px_rgba(0,0,0,0.22)] transition-all duration-300 ring-1 ring-white/25 active:scale-[0.97] pointer-events-auto disabled:opacity-45 disabled:cursor-not-allowed disabled:scale-100"
          aria-label="Next photo"
        >
          <span className="material-symbols-outlined text-3xl sm:text-4xl">arrow_forward</span>
        </button>
      </div>
    </div>
  );
}
