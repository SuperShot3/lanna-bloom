'use client';

export function ProductStickyBar({
  totalPrice,
  onAddToCart,
  addToCartLabel = 'Add to Cart',
}: {
  totalPrice: number;
  onAddToCart: () => void;
  addToCartLabel?: string;
}) {
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-stone-900/95 backdrop-blur-lg border-t border-stone-200 dark:border-stone-800 p-4 z-50 flex gap-3">
      <button
        type="button"
        className="p-4 border-2 border-stone-200 dark:border-stone-800 rounded-xl text-stone-500 hover:text-rose-500 transition-colors"
        aria-label="Add to favorites"
      >
        <span className="material-symbols-outlined">favorite_border</span>
      </button>
      <button
        type="button"
        onClick={onAddToCart}
        className="flex-1 bg-[#1A3C34] text-white font-bold py-4 rounded-xl shadow-lg hover:opacity-90 transition-opacity"
      >
        {addToCartLabel} — ฿{totalPrice.toLocaleString()}
      </button>
    </div>
  );
}
