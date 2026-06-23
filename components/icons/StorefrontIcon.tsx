'use client';

import type { CSSProperties } from 'react';

const ICON_SRC = {
  favorite: { default: '/icons/storefront/favorite.svg', filled: '/icons/storefront/favorite-filled.svg' },
  'shopping-cart': { default: '/icons/storefront/shopping-cart.svg' },
  'shopping-bag': { default: '/icons/storefront/shopping-bag.svg' },
  'arrow-forward': { default: '/icons/storefront/arrow-forward.svg' },
  'arrow-left': { default: '/icons/storefront/arrow-left.svg' },
  verified: { default: '/icons/storefront/verified.svg' },
  schedule: { default: '/icons/storefront/schedule.svg' },
  bolt: { default: '/icons/storefront/bolt.svg', filled: '/icons/storefront/bolt-filled.svg' },
  star: { default: '/icons/storefront/star.svg', filled: '/icons/storefront/star-filled.svg' },
  'grid-view': { default: '/icons/storefront/grid-view.svg' },
  handyman: { default: '/icons/storefront/handyman.svg' },
  'local-shipping': { default: '/icons/storefront/local-shipping.svg' },
  'support-agent': { default: '/icons/storefront/support-agent.svg' },
  store: { default: '/icons/storefront/store.svg' },
  'edit-note': { default: '/icons/storefront/edit-note.svg' },
  'local-fire-department': {
    default: '/icons/storefront/local-fire-department.svg',
    filled: '/icons/storefront/local-fire-department-filled.svg',
  },
  sell: { default: '/icons/storefront/sell-filled.svg', filled: '/icons/storefront/sell-filled.svg' },
  'location-on': { default: '/icons/storefront/location-on.svg' },
  'check-circle': { default: '/icons/storefront/check-circle.svg' },
  sms: { default: '/icons/storefront/sms.svg' },
  'water-drop': { default: '/icons/storefront/water-drop.svg' },
  'wb-sunny': { default: '/icons/storefront/wb-sunny.svg' },
  'local-florist': { default: '/icons/storefront/local-florist.svg' },
} as const;

export type StorefrontIconName = keyof typeof ICON_SRC;

/**
 * Self-hosted storefront icon (CSS mask + currentColor).
 * SVGs live in /public/icons/storefront/.
 */
export function StorefrontIcon({
  name,
  filled = false,
  size,
  className = '',
  style,
}: {
  name: StorefrontIconName;
  filled?: boolean;
  size?: number | string;
  className?: string;
  style?: CSSProperties;
}) {
  const entry = ICON_SRC[name];
  const src =
    filled && 'filled' in entry && entry.filled ? entry.filled : entry.default;
  const dimensionStyle: CSSProperties =
    size != null ? { width: size, height: size, flexShrink: 0 } : {};

  return (
    <span
      aria-hidden
      className={`storefront-icon ${className}`.trim()}
      style={{
        ...dimensionStyle,
        ...style,
        WebkitMaskImage: `url(${src})`,
        maskImage: `url(${src})`,
      }}
    />
  );
}
