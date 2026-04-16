'use client';

import { useState } from 'react';
import { animate, motion, useMotionValue, useTransform } from 'framer-motion';
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

type OutgoingCard = {
  card: HeroCard;
  startX: number;
  startRotate: number;
};

const SWIPE_THRESHOLD = 110;
const SWIPE_OUT_X = 720;

function cycleCards(cards: HeroCard[]) {
  if (cards.length <= 1) return cards;
  const [first, ...rest] = cards;
  return [...rest, first];
}

function getCardLayout(index: number) {
  if (index === 0) {
    return { scale: 1, y: 0, opacity: 1 };
  }

  if (index === 1) {
    return { scale: 0.955, y: 18, opacity: 0.74 };
  }

  return { scale: 0.915, y: 34, opacity: 0.48 };
}

export function HeroSwipeCards({ initialHeroImage, carouselImages }: { initialHeroImage?: string; carouselImages?: string[] }) {
  const sourceImages = carouselImages && carouselImages.length > 0
    ? carouselImages
    : FALLBACK_CARDS.map((card) => card.src);

  const [cards, setCards] = useState(() => sourceImages.map((src, index) => ({ id: index, src })));
  const [outgoingCard, setOutgoingCard] = useState<OutgoingCard | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  const x = useMotionValue(0);
  const rotate = useTransform(x, [-280, 280], [-14, 14]);
  const likeOpacity = useTransform(x, [14, 110], [0, 1]);

  const visibleCards = cards.slice(0, 3);
  const activeCard = visibleCards[0];

  const finishSwipe = () => {
    setOutgoingCard(null);
    setIsAnimating(false);
  };

  const commitSwipeRight = (startX = 0) => {
    if (isAnimating || cards.length <= 1 || !activeCard) return;

    setIsAnimating(true);
    setOutgoingCard({
      card: activeCard,
      startX,
      startRotate: Math.max(-14, Math.min(14, startX / 20)),
    });
    setCards((prev) => cycleCards(prev));
    x.set(0);
  };

  const handleButtonLike = () => {
    commitSwipeRight(0);
  };

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: { offset: { x: number }; velocity: { x: number } }) => {
    if (isAnimating) return;

    const currentX = x.get();
    const shouldSwipe = info.offset.x > SWIPE_THRESHOLD || info.velocity.x > 600;

    if (shouldSwipe) {
      commitSwipeRight(currentX);
      return;
    }

    animate(x, 0, {
      type: 'spring',
      stiffness: 380,
      damping: 32,
      mass: 0.8,
    });
  };

  if (!activeCard) return null;

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
              transition={{ type: 'spring', stiffness: 260, damping: 28, mass: 0.9 }}
              style={isTopCard ? { x, rotate, willChange: 'transform' } : undefined}
              drag={isTopCard && !isAnimating && cards.length > 1 ? 'x' : false}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.18}
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

              {isTopCard && (
                <motion.div
                  style={{ opacity: likeOpacity }}
                  className="absolute top-8 left-8 z-20 pointer-events-none"
                >
                  <div className="border-4 border-emerald-500 rounded-lg text-emerald-500 font-extrabold text-3xl px-4 py-1 uppercase tracking-wider -rotate-12 bg-white/90 shadow-sm">
                    LIKE
                  </div>
                </motion.div>
              )}
            </motion.div>
          );
        })}

        {outgoingCard && (
          <motion.div
            key={`outgoing-${outgoingCard.card.id}`}
            initial={{
              x: outgoingCard.startX,
              rotate: outgoingCard.startRotate,
              scale: 1,
              opacity: 1,
            }}
            animate={{
              x: SWIPE_OUT_X,
              rotate: 16,
              scale: 1,
              opacity: 1,
            }}
            transition={{
              duration: 0.32,
              ease: [0.22, 1, 0.36, 1],
            }}
            onAnimationComplete={finishSwipe}
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
        )}
      </div>

      <div className="absolute bottom-6 left-0 right-0 flex justify-center items-center gap-6 z-40 pointer-events-none px-4">
        <button
          onClick={handleButtonLike}
          disabled={isAnimating || cards.length <= 1}
          className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-emerald-800/90 shadow-[0_8px_30px_rgb(0,0,0,0.4)] flex items-center justify-center text-white hover:scale-110 hover:shadow-2xl hover:bg-emerald-700 transition-all duration-300 ring-2 ring-white/30 active:scale-95 pointer-events-auto disabled:opacity-60 disabled:cursor-not-allowed disabled:scale-100"
          aria-label="Like"
        >
          <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>favorite</span>
        </button>
      </div>
    </div>
  );
}
