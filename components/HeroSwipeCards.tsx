'use client';

import { useState, useRef, forwardRef, useImperativeHandle } from 'react';
import { motion, useMotionValue, useTransform, AnimatePresence, animate } from 'framer-motion';
import Image from 'next/image';

// Fallback images used ONLY when no images are set in Sanity Studio.
// Once you add images in Sanity (Site Settings → Hero Carousel Images), these are ignored.
const FALLBACK_CARDS = [
  { id: 1, src: 'https://images.unsplash.com/photo-1563241527-3004b7becc23?auto=format&fit=crop&q=80&w=800&h=1000' },
  { id: 2, src: 'https://images.unsplash.com/photo-1561181286-d3fee7d55ef6?auto=format&fit=crop&q=80&w=800&h=1000' },
  { id: 3, src: 'https://images.unsplash.com/photo-1526047932273-341f2a7631f9?auto=format&fit=crop&q=80&w=800&h=1000' },
  { id: 4, src: 'https://images.unsplash.com/photo-1562690868-60bbe7293e94?auto=format&fit=crop&q=80&w=800&h=1000' },
  { id: 5, src: 'https://images.unsplash.com/photo-1490750967868-88cb4ec0f07c?auto=format&fit=crop&q=80&w=800&h=1000' },
];

type SwipeCardHandle = { flyOff: () => void };

type SwipeCardProps = {
  card: { id: number; src: string };
  onSwipeStart?: () => void;
  onComplete: () => void;
};

// forwardRef lets the parent call flyOff() directly on the active card
const SwipeCard = forwardRef<SwipeCardHandle, SwipeCardProps>(
  function SwipeCard({ card, onSwipeStart, onComplete }, ref) {
    const x = useMotionValue(0);
    // Rotate card as it moves left/right — same feel as Tinder
    const rotate = useTransform(x, [-300, 300], [-18, 18]);
    // LIKE badge fades in only when dragging right
    const likeOpacity = useTransform(x, [20, 100], [0, 1]);

    const triggerFlyOff = (velocity = 0) => {
      onSwipeStart?.();
      animate(x, 820, {
        type: 'tween',
        duration: 0.22,
        ease: [0.22, 1, 0.36, 1],
        velocity,
        onComplete,
      });
    };

    // Called by the parent's Like button — throws card out, then advances the deck
    useImperativeHandle(ref, () => ({
      flyOff() {
        triggerFlyOff();
      },
    }));

    const handleDragEnd = (_: unknown, info: { offset: { x: number }; velocity: { x: number } }) => {
      if (info.offset.x > 100) {
        // Throw card off-screen using drag velocity for a natural feel
        triggerFlyOff(info.velocity.x);
      } else {
        // Snap back to center
        animate(x, 0, { type: 'spring', stiffness: 500, damping: 40 });
      }
    };

    return (
      <motion.div
        // x and rotate are driven entirely by our MotionValues — no conflict with exit
        style={{ x, rotate, willChange: 'transform' }}
        drag="x"
        // Wide constraints so Framer never fights our manual snap-back/fly-off animations
        dragConstraints={{ left: -600, right: 600 }}
        dragElastic={0}
        dragMomentum={false}
        onDragEnd={handleDragEnd}
        className="absolute inset-0 z-10 rounded-[2rem] overflow-hidden shadow-xl md:shadow-2xl cursor-grab active:cursor-grabbing"
        initial={{ scale: 0.92, opacity: 0, y: 16 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        // Exit is very short so card doesn't linger after fly-out.
        exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.08, ease: 'easeIn' } }}
        transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        <Image
          src={card.src}
          alt="Beautiful boutique floral arrangement"
          fill
          className="w-full h-full object-cover pointer-events-none"
          priority
          sizes="(max-width: 1024px) 100%, 50vw"
        />
        <motion.div
          style={{ opacity: likeOpacity }}
          className="absolute top-8 left-8 z-20 pointer-events-none"
        >
          <div className="border-4 border-emerald-500 rounded-lg text-emerald-500 font-extrabold text-3xl px-4 py-1 uppercase tracking-wider -rotate-12 bg-white/90 shadow-sm">
            LIKE
          </div>
        </motion.div>
      </motion.div>
    );
  }
);

export function HeroSwipeCards({ initialHeroImage, carouselImages }: { initialHeroImage?: string; carouselImages?: string[] }) {
  // Prefer Sanity images. Fall back to hardcoded placeholders only when Sanity has nothing configured.
  const sourceImages = carouselImages && carouselImages.length > 0
    ? carouselImages
    : FALLBACK_CARDS.map((c) => c.src);

  const allCards = sourceImages.map((src, i) => ({ id: i, src }));

  const [cards, setCards] = useState(allCards);
  // Prevents double-taps while a fly-off spring is in flight
  const [isAnimating, setIsAnimating] = useState(false);
  // Ref to the active card so we can imperatively trigger flyOff()
  const cardRef = useRef<SwipeCardHandle>(null);

  // Called after the card's spring animation reaches off-screen
  const advance = () => {
    setCards((prev) => {
      const [first, ...rest] = prev;
      return [...rest, first];
    });
    setIsAnimating(false);
  };

  const handleButtonLike = () => {
    if (isAnimating || !cardRef.current) return;
    setIsAnimating(true);
    cardRef.current.flyOff();
  };

  if (cards.length === 0) return null;

  const activeCard = cards[0];
  const nextCard = cards.length > 1 ? cards[1] : null;

  return (
    <div className="relative w-full h-full flex flex-col items-center">
      {/* Cards Stack Container */}
      <div className="relative w-full aspect-[4/5]">
        {/* Background card subtly moves forward while the top card flies out */}
        {nextCard && (
          <motion.div
            className="absolute inset-0 z-0 rounded-[2rem] overflow-hidden shadow-md"
            initial={false}
            animate={
              isAnimating
                ? { scale: 0.985, y: 2, opacity: 0.9 }
                : { scale: 0.95, y: 16, opacity: 0.7 }
            }
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            <Image
              src={nextCard.src}
              alt="Next floral arrangement"
              fill
              className="w-full h-full object-cover"
              sizes="(max-width: 1024px) 100%, 50vw"
            />
          </motion.div>
        )}

        {/*
          Default AnimatePresence mode: new card mounts while old card exits.
          By the time advance() fires, the old card is already off-screen (x=620),
          so the brief exit fade happens invisibly — the transition feels instant.
        */}
        <AnimatePresence>
          <SwipeCard
            key={activeCard.id}
            ref={cardRef}
            card={activeCard}
            onSwipeStart={() => setIsAnimating(true)}
            onComplete={advance}
          />
        </AnimatePresence>
      </div>

      {/* Action Buttons */}
      <div className="absolute bottom-6 left-0 right-0 flex justify-center items-center gap-6 z-40 pointer-events-none px-4">
        <button
          onClick={handleButtonLike}
          disabled={isAnimating}
          className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-emerald-800/90 shadow-[0_8px_30px_rgb(0,0,0,0.4)] flex items-center justify-center text-white hover:scale-110 hover:shadow-2xl hover:bg-emerald-700 transition-all duration-300 ring-2 ring-white/30 active:scale-95 pointer-events-auto disabled:opacity-60 disabled:cursor-not-allowed disabled:scale-100"
          aria-label="Like"
        >
          <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>favorite</span>
        </button>
      </div>
    </div>
  );
}
