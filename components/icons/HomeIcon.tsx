'use client';

export function HomeIcon({ className, size = 24 }: { className?: string; size?: number }) {
  return (
    <i
      className={`fi fi-rs-home ${className ?? ''}`.trim()}
      style={{ fontSize: size }}
      aria-hidden
    />
  );
}
