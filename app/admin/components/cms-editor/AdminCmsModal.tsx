'use client';

import { useEffect, useRef, type MouseEvent, type ReactNode } from 'react';

type Props = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
};

export function AdminCmsModal({ open, title, onClose, children, footer }: Props) {
  const backdropMouseDown = useRef(false);

  function onBackdropMouseDown(e: MouseEvent<HTMLDivElement>) {
    backdropMouseDown.current = e.target === e.currentTarget;
  }

  function onBackdropClick(e: MouseEvent<HTMLDivElement>) {
    if (backdropMouseDown.current && e.target === e.currentTarget) {
      onClose();
    }
    backdropMouseDown.current = false;
  }

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="admin-cms-modal-backdrop"
      role="presentation"
      onMouseDown={onBackdropMouseDown}
      onClick={onBackdropClick}
    >
      <div
        className="admin-cms-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-cms-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="admin-cms-modal-header">
          <h2 id="admin-cms-modal-title" className="admin-cms-modal-title">
            {title}
          </h2>
          <button
            type="button"
            className="admin-cms-modal-close"
            aria-label="Close"
            onClick={onClose}
          >
            <span className="material-symbols-outlined" aria-hidden>
              close
            </span>
          </button>
        </header>
        <div className="admin-cms-modal-body">{children}</div>
        {footer ? <footer className="admin-cms-modal-footer">{footer}</footer> : null}
      </div>
    </div>
  );
}
