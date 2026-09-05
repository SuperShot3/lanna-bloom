'use client';

import styles from './PlaceOrderAnimatedButton.module.css';

const TRUCK_SRC = '/check_out/animation/lanna-bloom-car-cleaned-final.svg';
const BOUQUET_SRC = '/check_out/animation/bouquet_flower.webp';

/** Keep in sync with `pickupExit` duration in the CSS module. */
export const PLACE_ORDER_DEPARTURE_MS = 1220;

export function waitForPlaceOrderDeparture(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    window.setTimeout(resolve, PLACE_ORDER_DEPARTURE_MS);
  });
}

export type PlaceOrderAnimatedButtonProps = {
  className?: string;
  onClick: () => void;
  disabled: boolean;
  placing: boolean;
  departing?: boolean;
  label: string;
};

export function PlaceOrderAnimatedButton({
  className,
  onClick,
  disabled,
  placing,
  departing = false,
  label,
}: PlaceOrderAnimatedButtonProps) {
  const classNames = [
    styles.btn,
    placing ? styles.isProcessing : '',
    departing ? styles.isDeparting : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type="button"
      className={classNames}
      onClick={onClick}
      disabled={disabled}
      aria-busy={placing}
      aria-live="polite"
    >
      <span className={styles.placeLabel}>
        <svg className={styles.placeIcon} viewBox="0 0 24 24" aria-hidden="true">
          <path d="M7 8.5h10l.85 11.2H6.15L7 8.5z" />
          <path d="M9.2 8.5V7.1a2.8 2.8 0 0 1 5.6 0v1.4" />
        </svg>
        <span className={styles.placeText}>{label}</span>
      </span>

      <span className={styles.road} aria-hidden="true" />

      <span className={styles.pickupScene} aria-hidden="true">
        <span className={styles.cargoFlowers}>
          <img
            className={styles.cargoFlowerImage}
            src={BOUQUET_SRC}
            alt=""
            aria-hidden="true"
            draggable={false}
          />
        </span>
        <div className={styles.headlightBeam} />
        <div className={`${styles.wheel} ${styles.wheelRear}`} />
        <div className={`${styles.wheel} ${styles.wheelFront}`} />
        <img
          className={styles.truckBody}
          src={TRUCK_SRC}
          alt=""
          aria-hidden="true"
          draggable={false}
        />
        <div className={styles.headlightSource} />
      </span>
    </button>
  );
}
