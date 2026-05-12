'use client';

import { useMemo, useState } from 'react';
import type { Locale } from '@/lib/i18n';
import { ORDER_LIFECYCLE_STATUSES } from '@/lib/orders/lifecycle';
import type { OrderLifecycleStatus, OrderStatusTimestamps } from '@/lib/orders/lifecycle';

export { ORDER_LIFECYCLE_STATUSES };
export type { OrderLifecycleStatus, OrderStatusTimestamps };
export type DriverAssignmentStatus = 'not_assigned' | 'assigned';

type StepState = 'completed' | 'current' | 'future';

type LifecycleStep = {
  id: OrderLifecycleStatus;
  shortLabel: string;
  title: string;
  text: string;
  historyText: string;
};

const STEPS: LifecycleStep[] = [
  {
    id: 'order_received',
    shortLabel: 'Received',
    title: 'We received your order.',
    text: 'Your order was created successfully. We are keeping everything together for the next step.',
    historyText: 'Order was received',
  },
  {
    id: 'payment_confirmed',
    shortLabel: 'Payment',
    title: 'Your payment is confirmed.',
    text: 'Your online payment was successful and your order is ready for our florist team.',
    historyText: 'Payment confirmed',
  },
  {
    id: 'order_accepted',
    shortLabel: 'Accepted',
    title: 'Our florist has accepted your order.',
    text: 'Our team has reviewed your order and confirmed the bouquet details.',
    historyText: 'Florist accepted the order',
  },
  {
    id: 'preparing',
    shortLabel: 'Preparing',
    title: 'We are preparing your bouquet.',
    text: 'Our florist is arranging your flowers and gift details with care.',
    historyText: 'Bouquet preparation started',
  },
  {
    id: 'ready_for_delivery',
    shortLabel: 'Ready',
    title: 'Your order is ready for delivery.',
    text: 'Your bouquet is wrapped and waiting for the delivery step.',
    historyText: 'Order is ready for delivery',
  },
  {
    id: 'out_for_delivery',
    shortLabel: 'On the way',
    title: 'Your gift is on the way.',
    text: 'Your order has left the shop and is being delivered to the recipient.',
    historyText: 'Gift went out for delivery',
  },
  {
    id: 'delivered',
    shortLabel: 'Delivered',
    title: 'Your order has been delivered.',
    text: 'Your flowers have arrived. We hope they made the moment feel special.',
    historyText: 'Order was delivered',
  },
];

const STEP_BY_ID = STEPS.reduce<Record<OrderLifecycleStatus, LifecycleStep>>((acc, step) => {
  acc[step.id] = step;
  return acc;
}, {} as Record<OrderLifecycleStatus, LifecycleStep>);

function formatLifecycleTimestamp(value: string | null | undefined, locale: Locale): string | null {
  if (!value) return null;
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString(locale === 'th' ? 'th-TH' : 'en-GB', {
      timeZone: 'Asia/Bangkok',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  } catch {
    return value;
  }
}

function getStepState(index: number, currentIndex: number): StepState {
  if (index < currentIndex) return 'completed';
  if (index === currentIndex) return 'current';
  return 'future';
}

function getTimestampLabel(
  timestamp: string | null | undefined,
  state: StepState,
  locale: Locale,
): string {
  const formatted = formatLifecycleTimestamp(timestamp, locale);
  if (formatted) return `Updated ${formatted}`;
  if (state === 'future') return 'Waiting for update';
  return 'Updated recently';
}

function OrderReceivedScene() {
  return (
    <svg className="lifecycle-svg" viewBox="0 0 120 120" aria-hidden="true" focusable="false">
      <rect className="scene-card" x="30" y="34" width="60" height="54" rx="13" />
      <path className="scene-gold-line" d="M42 51h22M42 63h36" />
      <circle className="scene-flower" cx="78" cy="50" r="8" />
      <path className="scene-check" d="M50 76l7 7 16-20" />
    </svg>
  );
}

function PaymentScene() {
  return (
    <svg className="lifecycle-svg" viewBox="0 0 120 120" aria-hidden="true" focusable="false">
      <rect className="scene-card scene-card--green" x="25" y="38" width="70" height="45" rx="12" />
      <path className="scene-card-band" d="M25 52h70" />
      <path className="scene-gold-line" d="M40 68h20" />
      <circle className="scene-success-orb" cx="82" cy="72" r="13" />
      <path className="scene-check scene-check--small" d="M76 72l5 5 10-12" />
    </svg>
  );
}

function AcceptedScene() {
  return (
    <svg className="lifecycle-svg" viewBox="0 0 120 120" aria-hidden="true" focusable="false">
      <path className="scene-awning" d="M31 48h58l-6-13H37z" />
      <path className="scene-awning-stripes" d="M45 35v13M60 35v13M75 35v13" />
      <rect className="scene-card" x="36" y="49" width="48" height="38" rx="8" />
      <path className="scene-gold-line" d="M48 68h24" />
      <circle className="scene-success-orb" cx="83" cy="44" r="11" />
      <path className="scene-check scene-check--tiny" d="M78 44l4 4 8-10" />
    </svg>
  );
}

function PreparingScene() {
  return (
    <svg className="lifecycle-svg" viewBox="0 0 120 120" aria-hidden="true" focusable="false">
      <path className="scene-stem" d="M60 85C55 70 50 58 42 45" />
      <path className="scene-stem scene-stem--two" d="M60 85c4-16 11-29 22-42" />
      <path className="scene-stem scene-stem--three" d="M60 85c0-18 0-31 0-48" />
      <circle className="scene-bloom scene-bloom--one" cx="42" cy="42" r="11" />
      <circle className="scene-bloom scene-bloom--two" cx="60" cy="34" r="12" />
      <circle className="scene-bloom scene-bloom--three" cx="82" cy="40" r="10" />
      <path className="scene-wrap" d="M43 73h34l-8 22H51z" />
    </svg>
  );
}

function ReadyScene() {
  return (
    <svg className="lifecycle-svg" viewBox="0 0 120 120" aria-hidden="true" focusable="false">
      <rect className="scene-card" x="32" y="45" width="56" height="42" rx="10" />
      <path className="scene-ribbon" d="M60 45v42M32 59h56" />
      <path className="scene-bow" d="M60 45c-12-18-26-6-10 2M60 45c12-18 26-6 10 2" />
      <circle className="scene-flower" cx="45" cy="36" r="8" />
      <circle className="scene-flower scene-flower--small" cx="76" cy="35" r="6" />
    </svg>
  );
}

function DeliveryScene() {
  return (
    <svg className="lifecycle-svg" viewBox="0 0 120 120" aria-hidden="true" focusable="false">
      <path className="scene-route" d="M24 78c18-20 35 18 52-4 8-10 12-24 24-24" />
      <g className="scene-vehicle">
        <rect className="scene-card scene-card--green" x="48" y="50" width="32" height="18" rx="6" />
        <path className="scene-gold-line" d="M58 50l8-9h13v9" />
        <circle className="scene-wheel" cx="56" cy="70" r="5" />
        <circle className="scene-wheel" cx="75" cy="70" r="5" />
      </g>
    </svg>
  );
}

function DeliveredScene() {
  return (
    <svg className="lifecycle-svg" viewBox="0 0 120 120" aria-hidden="true" focusable="false">
      <circle className="scene-success-orb scene-success-orb--large" cx="60" cy="61" r="27" />
      <path className="scene-check scene-check--large" d="M47 61l10 10 20-25" />
      <path className="scene-sparkle scene-sparkle--one" d="M35 34v12M29 40h12" />
      <path className="scene-sparkle scene-sparkle--two" d="M86 78v11M80 84h12" />
      <path className="scene-sparkle scene-sparkle--three" d="M88 31v9M83 36h10" />
    </svg>
  );
}

function SceneForStatus({ status }: { status: OrderLifecycleStatus }) {
  if (status === 'payment_confirmed') return <PaymentScene />;
  if (status === 'order_accepted') return <AcceptedScene />;
  if (status === 'preparing') return <PreparingScene />;
  if (status === 'ready_for_delivery') return <ReadyScene />;
  if (status === 'out_for_delivery') return <DeliveryScene />;
  if (status === 'delivered') return <DeliveredScene />;
  return <OrderReceivedScene />;
}

export function OrderLifecycleStatusSection({
  currentStatus,
  statusTimestamps,
  driverAssignmentStatus,
  driverName,
  locale = 'en',
}: {
  currentStatus: OrderLifecycleStatus;
  statusTimestamps: OrderStatusTimestamps;
  driverAssignmentStatus: DriverAssignmentStatus;
  driverName?: string | null;
  locale?: Locale;
}) {
  const [previewStatus, setPreviewStatus] = useState<OrderLifecycleStatus | null>(null);

  const currentIndex = Math.max(
    0,
    ORDER_LIFECYCLE_STATUSES.findIndex((status) => status === currentStatus),
  );
  const displayStatus = previewStatus ?? currentStatus;
  const displayIndex = Math.max(
    0,
    ORDER_LIFECYCLE_STATUSES.findIndex((status) => status === displayStatus),
  );
  const displayStep = STEP_BY_ID[displayStatus];
  const displayState = getStepState(displayIndex, currentIndex);
  const updatedLabel = getTimestampLabel(statusTimestamps[displayStatus], displayState, locale);
  const assignedDriverName = driverName?.trim() ?? '';
  const driverStatusText =
    driverAssignmentStatus === 'assigned'
      ? assignedDriverName
        ? `Assigned to ${assignedDriverName}`
        : 'Driver assigned'
      : 'No driver assigned yet';

  const progress = useMemo(
    () =>
      STEPS.map((step, index) => ({
        ...step,
        state: getStepState(index, currentIndex),
      })),
    [currentIndex],
  );

  return (
    <section className="order-lifecycle" aria-label="Order status lifecycle">
      <div className="order-lifecycle-top">
        <div className="order-lifecycle-eyebrow-row">
          <span className="order-lifecycle-pill">
            Current status: {STEP_BY_ID[currentStatus].shortLabel}
          </span>
          {previewStatus ? (
            <button
              type="button"
              className="order-lifecycle-current-btn"
              onClick={() => setPreviewStatus(null)}
            >
              Show current
            </button>
          ) : null}
        </div>

        <div className={`order-lifecycle-scene order-lifecycle-scene--${displayStatus}`}>
          <SceneForStatus status={displayStatus} />
        </div>

        <div className="order-lifecycle-progress" aria-label="Order progress">
          <div className="order-lifecycle-progress-line" aria-hidden />
          {progress.map((step) => (
            <button
              key={step.id}
              type="button"
              className={`order-lifecycle-step order-lifecycle-step--${step.state} ${
                previewStatus === step.id ? 'order-lifecycle-step--preview' : ''
              }`}
              onClick={() => setPreviewStatus(step.id === currentStatus ? null : step.id)}
              aria-current={step.state === 'current' ? 'step' : undefined}
              aria-label={`${step.title} ${getTimestampLabel(statusTimestamps[step.id], step.state, locale)}`}
            >
              <span className="order-lifecycle-step-dot">
                {step.state === 'completed' ? <span aria-hidden>✓</span> : null}
              </span>
              <span className="order-lifecycle-step-label">{step.shortLabel}</span>
            </button>
          ))}
        </div>

        <div className="order-lifecycle-copy">
          <div className="order-lifecycle-preview-label">
            {previewStatus ? 'Status preview' : 'Status update'}
          </div>
          <h2>{displayStep.title}</h2>
          <p>{displayStep.text}</p>
          <div className="order-lifecycle-updated">{updatedLabel}</div>
        </div>

        <div className="order-lifecycle-driver" aria-label="Driver assignment status">
          <span className="order-lifecycle-driver-label">Delivery driver</span>
          <span className="order-lifecycle-driver-value">{driverStatusText}</span>
        </div>
      </div>

      <div className="order-lifecycle-history">
        <div className="order-lifecycle-history-title">Status history</div>
        <ul>
          {progress.map((step) => (
            <li key={step.id} className={`order-lifecycle-history-item order-lifecycle-history-item--${step.state}`}>
              <span className="order-lifecycle-history-marker" aria-hidden>
                {step.state === 'completed' ? '✓' : step.state === 'current' ? <span /> : ''}
              </span>
              <span className="order-lifecycle-history-copy">
                <span className="order-lifecycle-history-text">{step.historyText}</span>
                <span className="order-lifecycle-history-time">
                  {getTimestampLabel(statusTimestamps[step.id], step.state, locale)}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      <style jsx global>{`
        .order-lifecycle {
          margin: 0 0 1.25rem;
          border: 1px solid color-mix(in srgb, var(--accent-border, #a88b5c) 30%, var(--border, #ebe6e0));
          border-radius: 22px;
          background:
            radial-gradient(circle at top left, rgba(197, 160, 89, 0.13), transparent 32%),
            linear-gradient(180deg, var(--surface, #fff), var(--pastel-cream, #f9f5f0));
          box-shadow: 0 14px 36px rgba(45, 42, 38, 0.08);
          overflow: hidden;
        }
        .order-lifecycle-top {
          padding: 18px 16px 16px;
        }
        .order-lifecycle-eyebrow-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 12px;
        }
        .order-lifecycle-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          width: fit-content;
          padding: 7px 11px;
          border-radius: 999px;
          background: rgba(26, 95, 74, 0.08);
          border: 1px solid rgba(26, 95, 74, 0.18);
          color: #1a5f4a;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.03em;
          text-transform: uppercase;
          box-shadow: 0 0 0 4px rgba(26, 95, 74, 0.04);
        }
        .order-lifecycle-pill::before {
          content: '';
          width: 7px;
          height: 7px;
          border-radius: 999px;
          background: #1a5f4a;
          box-shadow: 0 0 0 0 rgba(26, 95, 74, 0.28);
          animation: lifecyclePulse 1.8s ease-out infinite;
        }
        .order-lifecycle-current-btn {
          border: 1px solid var(--border, #ebe6e0);
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.72);
          color: var(--accent-border, #a88b5c);
          font: inherit;
          font-size: 11px;
          font-weight: 700;
          padding: 7px 10px;
          cursor: pointer;
        }
        .order-lifecycle-scene {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: min(168px, 46vw);
          height: min(168px, 46vw);
          margin: 4px auto 12px;
          border-radius: 42%;
          background:
            radial-gradient(circle at 35% 28%, rgba(255, 255, 255, 0.94), transparent 32%),
            linear-gradient(145deg, rgba(232, 223, 208, 0.9), rgba(232, 240, 237, 0.75));
          box-shadow:
            inset 0 0 0 1px rgba(255, 255, 255, 0.72),
            0 14px 30px rgba(45, 42, 38, 0.08);
          animation: lifecycleSceneFloat 3.8s ease-in-out infinite;
        }
        .order-lifecycle-scene::after {
          content: '';
          position: absolute;
          inset: 14%;
          border-radius: inherit;
          border: 1px solid rgba(197, 160, 89, 0.2);
          pointer-events: none;
        }
        .lifecycle-svg {
          width: 78%;
          height: 78%;
          overflow: visible;
        }
        .scene-card {
          fill: #fffaf3;
          stroke: rgba(168, 139, 92, 0.55);
          stroke-width: 2;
          filter: drop-shadow(0 8px 12px rgba(45, 42, 38, 0.08));
        }
        .scene-card--green {
          fill: #eef7f2;
          stroke: rgba(26, 95, 74, 0.28);
        }
        .scene-gold-line,
        .scene-card-band,
        .scene-ribbon,
        .scene-bow,
        .scene-route,
        .scene-awning-stripes,
        .scene-stem,
        .scene-sparkle {
          fill: none;
          stroke-linecap: round;
          stroke-linejoin: round;
        }
        .scene-gold-line,
        .scene-card-band,
        .scene-ribbon,
        .scene-bow,
        .scene-awning-stripes {
          stroke: #c5a059;
          stroke-width: 3;
        }
        .scene-check {
          fill: none;
          stroke: #1a5f4a;
          stroke-width: 5;
          stroke-linecap: round;
          stroke-linejoin: round;
          stroke-dasharray: 46;
          animation: lifecycleDrawCheck 1.2s ease both;
        }
        .scene-check--small {
          stroke: #fff;
          stroke-width: 4;
          stroke-dasharray: 28;
        }
        .scene-check--tiny {
          stroke: #fff;
          stroke-width: 3.5;
          stroke-dasharray: 22;
        }
        .scene-check--large {
          stroke: #fff;
          stroke-width: 7;
          stroke-dasharray: 52;
        }
        .scene-flower,
        .scene-bloom {
          fill: #e6be8a;
          stroke: rgba(168, 139, 92, 0.35);
          stroke-width: 2;
        }
        .scene-flower--small {
          fill: #e8f0ed;
        }
        .scene-success-orb {
          fill: #1a5f4a;
          filter: drop-shadow(0 0 10px rgba(26, 95, 74, 0.22));
        }
        .scene-success-orb--large {
          fill: #1a5f4a;
          animation: lifecycleSoftGlow 2.2s ease-in-out infinite;
        }
        .scene-awning {
          fill: #e8dfd0;
          stroke: rgba(168, 139, 92, 0.55);
          stroke-width: 2;
          stroke-linejoin: round;
        }
        .scene-stem {
          stroke: #1a5f4a;
          stroke-width: 4;
        }
        .scene-wrap {
          fill: #fffaf3;
          stroke: rgba(168, 139, 92, 0.55);
          stroke-width: 2;
          stroke-linejoin: round;
        }
        .scene-bloom {
          transform-box: fill-box;
          transform-origin: center;
        }
        .scene-bloom--one {
          animation: lifecycleBloom 2.4s ease-in-out infinite;
        }
        .scene-bloom--two {
          animation: lifecycleBloom 2.4s 0.22s ease-in-out infinite;
        }
        .scene-bloom--three {
          animation: lifecycleBloom 2.4s 0.44s ease-in-out infinite;
        }
        .scene-route {
          stroke: rgba(168, 139, 92, 0.6);
          stroke-width: 3;
          stroke-dasharray: 5 7;
        }
        .scene-vehicle {
          animation: lifecycleVehicle 2.8s ease-in-out infinite;
          transform-origin: center;
          transform-box: fill-box;
        }
        .scene-wheel {
          fill: #1a3c34;
        }
        .scene-sparkle {
          stroke: #c5a059;
          stroke-width: 3;
          animation: lifecycleSparkle 2.1s ease-in-out infinite;
        }
        .scene-sparkle--two {
          animation-delay: 0.28s;
        }
        .scene-sparkle--three {
          animation-delay: 0.52s;
        }
        .order-lifecycle-progress {
          position: relative;
          display: grid;
          grid-template-columns: repeat(7, minmax(0, 1fr));
          gap: 2px;
          margin: 8px 0 16px;
          padding-top: 10px;
        }
        .order-lifecycle-progress-line {
          position: absolute;
          top: 21px;
          left: 7%;
          right: 7%;
          height: 2px;
          background: linear-gradient(90deg, rgba(26, 95, 74, 0.35), rgba(197, 160, 89, 0.18));
          border-radius: 999px;
        }
        .order-lifecycle-step {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          min-width: 0;
          padding: 0;
          border: 0;
          background: transparent;
          color: var(--text-muted, #6b6560);
          font: inherit;
          cursor: pointer;
        }
        .order-lifecycle-step-dot {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          border-radius: 999px;
          background: #fff;
          border: 2px solid var(--border, #ebe6e0);
          color: #fff;
          font-size: 12px;
          font-weight: 800;
          transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
        }
        .order-lifecycle-step-label {
          max-width: 62px;
          min-height: 24px;
          color: inherit;
          font-size: 9px;
          font-weight: 700;
          line-height: 1.2;
          text-align: center;
        }
        .order-lifecycle-step--completed .order-lifecycle-step-dot {
          background: #1a5f4a;
          border-color: #1a5f4a;
          box-shadow: 0 0 0 4px rgba(26, 95, 74, 0.08);
        }
        .order-lifecycle-step--current {
          color: #1a5f4a;
        }
        .order-lifecycle-step--current .order-lifecycle-step-dot {
          background: #fff;
          border-color: #1a5f4a;
          box-shadow: 0 0 0 5px rgba(26, 95, 74, 0.12);
          animation: lifecycleDotPulse 1.8s ease-out infinite;
        }
        .order-lifecycle-step--current .order-lifecycle-step-dot::after {
          content: '';
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background: #1a5f4a;
        }
        .order-lifecycle-step--future .order-lifecycle-step-dot {
          background: rgba(255, 255, 255, 0.68);
        }
        .order-lifecycle-step--preview .order-lifecycle-step-dot,
        .order-lifecycle-step:focus-visible .order-lifecycle-step-dot,
        .order-lifecycle-step:hover .order-lifecycle-step-dot {
          transform: translateY(-1px);
          border-color: var(--accent, #c5a059);
          box-shadow: 0 0 0 5px rgba(197, 160, 89, 0.12);
        }
        .order-lifecycle-copy {
          text-align: center;
        }
        .order-lifecycle-preview-label {
          color: var(--accent-border, #a88b5c);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .order-lifecycle-copy h2 {
          margin: 4px 0 6px;
          color: var(--text, #2d2a26);
          font-family: var(--font-serif, Georgia, serif);
          font-size: 1.35rem;
          line-height: 1.2;
        }
        .order-lifecycle-copy p {
          max-width: 430px;
          margin: 0 auto;
          color: var(--text-muted, #6b6560);
          font-size: 13px;
          line-height: 1.65;
        }
        .order-lifecycle-updated {
          margin-top: 10px;
          color: #1a5f4a;
          font-size: 12px;
          font-weight: 700;
        }
        .order-lifecycle-driver {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-top: 14px;
          padding: 10px 12px;
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.62);
          border: 1px solid rgba(235, 230, 224, 0.9);
        }
        .order-lifecycle-driver-label {
          color: var(--text-muted, #6b6560);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }
        .order-lifecycle-driver-value {
          color: var(--text, #2d2a26);
          font-size: 12px;
          font-weight: 700;
        }
        .order-lifecycle-history {
          padding: 14px 16px 16px;
          background: rgba(255, 255, 255, 0.55);
          border-top: 1px solid rgba(235, 230, 224, 0.9);
        }
        .order-lifecycle-history-title {
          margin-bottom: 10px;
          color: var(--text-muted, #6b6560);
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }
        .order-lifecycle-history ul {
          display: grid;
          gap: 8px;
          margin: 0;
          padding: 0;
          list-style: none;
        }
        .order-lifecycle-history-item {
          display: grid;
          grid-template-columns: 24px 1fr;
          align-items: start;
          gap: 8px;
          opacity: 0.74;
        }
        .order-lifecycle-history-item--completed,
        .order-lifecycle-history-item--current {
          opacity: 1;
        }
        .order-lifecycle-history-marker {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 20px;
          height: 20px;
          margin-top: 1px;
          border-radius: 999px;
          border: 1px solid var(--border, #ebe6e0);
          color: #fff;
          background: rgba(255, 255, 255, 0.8);
          font-size: 11px;
          font-weight: 800;
        }
        .order-lifecycle-history-item--completed .order-lifecycle-history-marker {
          background: #1a5f4a;
          border-color: #1a5f4a;
        }
        .order-lifecycle-history-item--current .order-lifecycle-history-marker {
          border-color: #1a5f4a;
          box-shadow: 0 0 0 4px rgba(26, 95, 74, 0.1);
        }
        .order-lifecycle-history-item--current .order-lifecycle-history-marker span {
          width: 7px;
          height: 7px;
          border-radius: 999px;
          background: #1a5f4a;
          animation: lifecycleDotPulse 1.8s ease-out infinite;
        }
        .order-lifecycle-history-copy {
          display: grid;
          gap: 1px;
        }
        .order-lifecycle-history-text {
          color: var(--text, #2d2a26);
          font-size: 12px;
          font-weight: 700;
        }
        .order-lifecycle-history-time {
          color: var(--text-muted, #6b6560);
          font-size: 11px;
          line-height: 1.4;
        }
        .order-lifecycle-history-item--future .order-lifecycle-history-text,
        .order-lifecycle-history-item--future .order-lifecycle-history-time {
          color: color-mix(in srgb, var(--text-muted, #6b6560) 72%, #fff);
        }
        @keyframes lifecyclePulse {
          0% {
            box-shadow: 0 0 0 0 rgba(26, 95, 74, 0.28);
          }
          80%,
          100% {
            box-shadow: 0 0 0 8px rgba(26, 95, 74, 0);
          }
        }
        @keyframes lifecycleDotPulse {
          0% {
            box-shadow: 0 0 0 0 rgba(26, 95, 74, 0.22);
          }
          80%,
          100% {
            box-shadow: 0 0 0 9px rgba(26, 95, 74, 0);
          }
        }
        @keyframes lifecycleSceneFloat {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-4px);
          }
        }
        @keyframes lifecycleDrawCheck {
          from {
            stroke-dashoffset: 52;
          }
          to {
            stroke-dashoffset: 0;
          }
        }
        @keyframes lifecycleSoftGlow {
          0%,
          100% {
            filter: drop-shadow(0 0 8px rgba(26, 95, 74, 0.18));
          }
          50% {
            filter: drop-shadow(0 0 18px rgba(26, 95, 74, 0.32));
          }
        }
        @keyframes lifecycleBloom {
          0%,
          100% {
            transform: scale(0.92);
          }
          45% {
            transform: scale(1.08);
          }
        }
        @keyframes lifecycleVehicle {
          0%,
          100% {
            transform: translateX(-5px);
          }
          50% {
            transform: translateX(7px) translateY(-2px);
          }
        }
        @keyframes lifecycleSparkle {
          0%,
          100% {
            opacity: 0.42;
            transform: scale(0.94);
          }
          45% {
            opacity: 1;
            transform: scale(1.08);
          }
        }
        @media (min-width: 560px) {
          .order-lifecycle-top {
            padding: 20px 22px 18px;
          }
          .order-lifecycle-history {
            padding: 16px 22px 18px;
          }
          .order-lifecycle-step-label {
            font-size: 10px;
          }
          .order-lifecycle-copy h2 {
            font-size: 1.5rem;
          }
        }
        @media (max-width: 380px) {
          .order-lifecycle-top {
            padding-left: 12px;
            padding-right: 12px;
          }
          .order-lifecycle-step-label {
            display: none;
          }
          .order-lifecycle-progress {
            margin-bottom: 18px;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .order-lifecycle-pill::before,
          .order-lifecycle-scene,
          .order-lifecycle-step--current .order-lifecycle-step-dot,
          .order-lifecycle-history-item--current .order-lifecycle-history-marker span,
          .scene-check,
          .scene-success-orb--large,
          .scene-bloom,
          .scene-vehicle,
          .scene-sparkle {
            animation: none;
          }
        }
      `}</style>
    </section>
  );
}
