'use client';

import type { ReactNode } from 'react';

export function LineIdFieldReveal({
  open,
  children,
}: {
  open: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={`line-id-field-reveal${open ? ' line-id-field-reveal--open' : ''}`}
      aria-hidden={!open}
    >
      <div className="line-id-field-reveal__inner">{children}</div>
      <style jsx>{`
        .line-id-field-reveal {
          display: grid;
          grid-template-rows: 0fr;
          opacity: 0;
          transform: translateY(-6px);
          pointer-events: none;
          visibility: hidden;
          transition:
            grid-template-rows 0.58s cubic-bezier(0.22, 0.61, 0.36, 1),
            opacity 0.46s ease-out,
            transform 0.52s cubic-bezier(0.22, 0.61, 0.36, 1),
            visibility 0s linear 0.58s;
        }

        .line-id-field-reveal--open {
          grid-template-rows: 1fr;
          opacity: 1;
          transform: translateY(0);
          pointer-events: auto;
          visibility: visible;
          transition:
            grid-template-rows 0.58s cubic-bezier(0.22, 0.61, 0.36, 1),
            opacity 0.46s ease-out,
            transform 0.52s cubic-bezier(0.22, 0.61, 0.36, 1),
            visibility 0s linear 0s;
        }

        .line-id-field-reveal__inner {
          overflow: hidden;
          min-height: 0;
        }

        @media (prefers-reduced-motion: reduce) {
          .line-id-field-reveal {
            transition: none;
            transform: none;
          }
        }
      `}</style>
    </div>
  );
}
