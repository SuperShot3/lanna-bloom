'use client';

import Link from 'next/link';
import { StorefrontIcon } from '@/components/icons';

const PREMIUM_CTA_CLASS =
  'hero-cta hero-cta--premium group relative isolate overflow-hidden px-6 py-3 sm:px-8 sm:py-4 font-semibold rounded-full shadow-[0_12px_28px_-14px_rgba(26,60,52,0.7)] hover:shadow-[0_20px_40px_-18px_rgba(26,60,52,0.72)] hover:-translate-y-1 transition-all duration-300 inline-flex items-center justify-center gap-2 text-sm sm:text-base';

export function PremiumCtaLink({
  href,
  onClick,
  children,
  className,
}: {
  href: string;
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <>
      <Link
        href={href}
        onClick={onClick}
        className={className ? `${PREMIUM_CTA_CLASS} ${className}` : PREMIUM_CTA_CLASS}
      >
        <span
          aria-hidden
          className="hero-cta__sheen pointer-events-none absolute inset-0 -translate-x-[120%] bg-[linear-gradient(110deg,transparent_24%,rgba(255,255,255,0.55)_50%,transparent_76%)] transition-transform duration-700 ease-out group-hover:translate-x-[120%]"
        />
        <span className="relative z-[1]">{children}</span>
        <StorefrontIcon
          name="arrow-forward"
          size={20}
          className="relative z-[1] transition-transform duration-300 group-hover:translate-x-0.5"
        />
      </Link>
      <style jsx>{`
        @media (hover: none) and (pointer: coarse) {
          .hero-cta--premium .hero-cta__sheen {
            animation: hero-cta-mobile-sheen 3s ease-in-out infinite;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .hero-cta--premium .hero-cta__sheen {
            animation: none;
          }
        }

        @keyframes hero-cta-mobile-sheen {
          0%,
          64% {
            transform: translateX(-120%);
          }
          100% {
            transform: translateX(120%);
          }
        }
      `}</style>
    </>
  );
}
