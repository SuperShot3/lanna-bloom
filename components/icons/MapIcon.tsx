'use client';

export function MapIcon({ className, size = 24 }: { className?: string; size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 8c0 4.5-6 13-6 13S6 12.5 6 8a6 6 0 0 1 12 0Z" />
      <circle cx="12" cy="8" r="2" />
    </svg>
  );
}
