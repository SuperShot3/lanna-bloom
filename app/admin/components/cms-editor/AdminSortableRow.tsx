'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { ReactNode } from 'react';

type Props = {
  id: string;
  title: string;
  icon?: ReactNode;
  onIconClick?: () => void;
  onRowClick?: () => void;
  expanded?: boolean;
  menu?: ReactNode;
  badge?: ReactNode;
  children?: ReactNode;
};

export function AdminSortableRow({
  id,
  title,
  icon,
  onIconClick,
  onRowClick,
  expanded,
  menu,
  badge,
  children,
}: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`admin-cms-sortable-row${isDragging ? ' is-dragging' : ''}${expanded ? ' is-expanded' : ''}`}
    >
      <div
        className="admin-cms-sortable-row-head"
        role={onRowClick ? 'button' : undefined}
        tabIndex={onRowClick ? 0 : undefined}
        onClick={onRowClick}
        onKeyDown={
          onRowClick
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onRowClick();
                }
              }
            : undefined
        }
      >
        <button
          type="button"
          className="admin-cms-drag-handle"
          aria-label="Drag to reorder"
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
        >
          <span className="material-symbols-outlined" aria-hidden>
            drag_indicator
          </span>
        </button>
        {onIconClick ? (
          <button
            type="button"
            className="admin-cms-sortable-icon admin-cms-sortable-icon-btn"
            aria-label="Preview image"
            onClick={(e) => {
              e.stopPropagation();
              onIconClick();
            }}
          >
            {icon ?? <span className="material-symbols-outlined">inventory_2</span>}
          </button>
        ) : (
          <span className="admin-cms-sortable-icon" aria-hidden>
            {icon ?? <span className="material-symbols-outlined">inventory_2</span>}
          </span>
        )}
        <span className="admin-cms-sortable-title">{title}</span>
        {badge}
        {onRowClick ? (
          <span className={`admin-cms-sortable-chevron material-symbols-outlined${expanded ? ' is-open' : ''}`} aria-hidden>
            chevron_right
          </span>
        ) : null}
        {menu}
      </div>
      {expanded && children ? <div className="admin-cms-sortable-row-body">{children}</div> : null}
    </div>
  );
}
