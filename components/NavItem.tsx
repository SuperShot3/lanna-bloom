'use client';

import Link from 'next/link';

/**
 * Unified nav item: icon + label always on ONE line.
 * Same DOM structure for all items (icon optional).
 * Root cause of wrapping: inconsistent structure + missing white-space:nowrap on inner elements.
 * Fix: single flex row, align-items:center, gap, white-space:nowrap on label.
 */
export function NavItem({
  href,
  label,
  icon,
  active,
  onClick,
  className = '',
  variant = 'pill',
  ariaLabel,
}: {
  href: string;
  label: string;
  icon?: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
  className?: string;
  variant?: 'pill' | 'action' | 'mobile';
  ariaLabel?: string;
}) {
  const baseClass = 'nav-item';
  const variantClass = `nav-item--${variant}`;
  const activeClass = active ? 'nav-item--active' : '';

  return (
    <Link
      href={href}
      className={`${baseClass} ${variantClass} ${activeClass} ${className}`.trim()}
      onClick={onClick}
      aria-label={ariaLabel ?? label}
      title={ariaLabel ?? label}
    >
      {icon != null && <span className="nav-item__icon" aria-hidden>{icon}</span>}
      <span className="nav-item__label">{label}</span>
    </Link>
  );
}
