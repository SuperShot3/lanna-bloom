'use client';

export function BoltIcon({ className, size = 24 }: { className?: string; size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      aria-hidden
      fill="currentColor"
    >
      <path d="M11 21h-1l1-7H7.5c-.58 0-.57-.32-.38-.66.19-.34.05-.08 3.41-6.26 1.39-2.36 1.39-2.36 1.39-2.36h3.18L13 3h1l-1 7h3.5c.49 0 .56.33.47.51l-.07.15c-.1.18-.17.28-3.4 6.34-1.39 2.36-1.39 2.36-1.39 2.36H11z" />
    </svg>
  );
}
