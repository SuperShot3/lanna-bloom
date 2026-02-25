'use client';

export function CartIcon({ className, size = 24 }: { className?: string; size?: number }) {
  return (
    <i
      className={`fi fi-rr-shopping-bag ${className ?? ''}`.trim()}
      style={{ fontSize: size }}
      aria-hidden
    />
  );
}
