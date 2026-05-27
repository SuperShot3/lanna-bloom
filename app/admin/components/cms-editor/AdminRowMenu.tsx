'use client';

import { useEffect, useRef, useState } from 'react';

export type AdminRowMenuItem = {
  id: string;
  label: string;
  onClick: () => void;
  destructive?: boolean;
  disabled?: boolean;
};

type Props = {
  items: AdminRowMenuItem[];
  ariaLabel?: string;
};

export function AdminRowMenu({ items, ariaLabel = 'Actions' }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  return (
    <div className="admin-cms-row-menu" ref={rootRef}>
      <button
        type="button"
        className="admin-cms-row-menu-trigger"
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        <span className="material-symbols-outlined" aria-hidden>
          more_horiz
        </span>
      </button>
      {open ? (
        <div className="admin-cms-row-menu-panel" role="menu">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              role="menuitem"
              className={`admin-cms-row-menu-item${item.destructive ? ' is-destructive' : ''}`}
              disabled={item.disabled}
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                item.onClick();
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
