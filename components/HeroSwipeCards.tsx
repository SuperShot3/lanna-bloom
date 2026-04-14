'use client';

import { useState } from 'react';
import { motion, useMotionValue, useTransform, AnimatePresence } from 'framer-motion';
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

function SwipeCard({ card, onSwipeRight, exitDirection }: any) {
  // Each card must have its OWN motion value!
  // This prevents the currently exiting card from freezing when the parent attempts to reset position
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-10, 10]);

  const handleDragEnd = (event: any, info: any) => {
    const swipeThreshold = 100;
    // Let go! Only trigger swipe out if they swiped right strongly. Otherwise it snaps back.
    if (info.offset.x > swipeThreshold) {
      onSwipeRight();
    }
  };

  return (
    <motion.div
      style={{ x, rotate, willChange: 'transform' }}
      drag="x"
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.8}
      onDragEnd={handleDragEnd}
      className="absolute inset-0 z-10 rounded-[2rem] overflow-hidden shadow-xl md:shadow-2xl cursor-grab active:cursor-grabbing"
      initial={{ scale: 0.96, opacity: 1 }}
      animate={{ scale: 1, opacity: 1, transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] } }}
      exit={{ x: exitDirection === 'right' ? 500 : -500, opacity: 1, scale: 0.95, transition: { duration: 0.32, ease: [0.55, 0, 1, 0.45] } }}
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
        style={{ opacity: useTransform(x, [0, 150], [0, 1]) }}
        className="absolute top-8 left-8 z-20 pointer-events-none"
      >
        <div className="border-4 border-emerald-500 rounded-lg text-emerald-500 font-extrabold text-3xl px-4 py-1 uppercase tracking-wider -rotate-12 bg-white/90 shadow-sm">
          LIKE
        </div>
      </motion.div>
    </motion.div>
  );
}

export function HeroSwipeCards({ initialHeroImage, carouselImages }: { initialHeroImage?: string; carouselImages?: string[] }) {
  // Prefer Sanity images. Fall back to hardcoded placeholders only when Sanity has nothing configured.
  const sourceImages = carouselImages && carouselImages.length > 0
    ? carouselImages
    : FALLBACK_CARDS.map((c) => c.src);

  const allCards = sourceImages.map((src, i) => ({ id: i, src }));

  const [cards, setCards] = useState(allCards);
  const [likedCards, setLikedCards] = useState<number[]>([]);
  const [exitDirection, setExitDirection] = useState<'left' | 'right'>('right');

  const handleSwipeRight = () => {
    if (cards.length === 0) return;
    setExitDirection('right');
    const activeCard = cards[0];
    
    setLikedCards((prev) => [...prev, activeCard.id]);
    
    // Cycle the cards indefinitely
    setCards((prev) => {
      const rest = prev.slice(1);
      return [...rest, activeCard];
    });
    // NOTICE NO x.set(0) needed here anymore!
  };

  const handleButtonLike = () => {
    handleSwipeRight();
  };

  if (cards.length === 0) return null;

  const activeCard = cards[0];
  const nextCard = cards.length > 1 ? cards[1] : null;

  return (
    <div className="relative w-full h-full flex flex-col items-center">
      {/* Cards Stack Container */}
      <div className="relative w-full aspect-[4/5]">
        {/* Next Card Background */}
        {nextCard && (
          <div className="absolute inset-0 z-0 scale-[0.95] translate-y-4 rounded-[2rem] overflow-hidden shadow-md opacity-70">
            <Image
              src={nextCard.src}
              alt="Next floral arrangement"
              fill
              className="w-full h-full object-cover"
              sizes="(max-width: 1024px) 100%, 50vw"
            />
          </div>
        )}

        <AnimatePresence>
          <SwipeCard 
            key={activeCard.id} 
            card={activeCard} 
            onSwipeRight={handleSwipeRight} 
            exitDirection={exitDirection} 
          />
        </AnimatePresence>
      </div>

      {/* Action Buttons overlay */}
      <div className="absolute bottom-6 left-0 right-0 flex justify-center items-center gap-6 z-40 pointer-events-none px-4">
        <button
          onClick={handleButtonLike}
          className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-emerald-800/90 shadow-[0_8px_30px_rgb(0,0,0,0.4)] flex items-center justify-center text-white hover:scale-110 hover:shadow-2xl hover:bg-emerald-700 transition-all duration-300 ring-2 ring-white/30 active:scale-95 pointer-events-auto"
          aria-label="Like"
        >
          <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>favorite</span>
        </button>
      </div>
    </div>
  );
}
