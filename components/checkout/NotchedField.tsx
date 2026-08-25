'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Checkout field with label notched into the top border (same pattern as province select).
 */
export function NotchedField({
  id,
  label,
  required = false,
  className,
  children,
  hint,
}: {
  id?: string;
  label: ReactNode;
  required?: boolean;
  className?: string;
  children: ReactNode;
  hint?: ReactNode;
}) {
  return (
    <div className={cn('notched-field', className)}>
      <label className="notched-field__label" htmlFor={id}>
        {label}
        {required ? (
          <>
            {' '}
            <span className="notched-field__req" aria-hidden>
              *
            </span>
          </>
        ) : null}
      </label>
      <div className="notched-field__control">{children}</div>
      {hint ? <div className="notched-field__hint">{hint}</div> : null}
      <style jsx global>{`
        .notched-field {
          position: relative;
          margin-top: 8px;
        }
        .notched-field__label {
          position: absolute;
          top: -7px;
          left: 14px;
          z-index: 2;
          padding: 0 6px;
          margin: 0;
          background: var(--surface);
          font-size: 13px;
          font-weight: 600;
          line-height: 1;
          color: var(--text-muted);
          pointer-events: none;
          max-width: calc(100% - 28px);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .notched-field__req {
          color: var(--accent);
        }
        .notched-field__control {
          position: relative;
        }
        .notched-field__control > .co-input,
        .notched-field__control > .cart-contact-input,
        .notched-field__control > textarea.co-input,
        .notched-field__control > textarea.cart-contact-input {
          width: 100%;
          box-sizing: border-box;
        }
        .notched-field__control > .co-input:focus,
        .notched-field__control > .cart-contact-input:focus,
        .notched-field__control > textarea:focus {
          outline: none;
          border-color: color-mix(in srgb, var(--accent) 45%, var(--border));
        }
        .notched-field__hint {
          margin-top: 6px;
        }
      `}</style>
    </div>
  );
}
