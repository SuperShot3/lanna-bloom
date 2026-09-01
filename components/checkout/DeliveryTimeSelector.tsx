'use client';

import { useEffect, useState } from 'react';
import type { Locale } from '@/lib/i18n';
import { translations } from '@/lib/i18n';
import { SelectionTile } from '@/components/checkout/premium/SelectionTile';
import { OverlayReveal } from '@/components/ui/overlay-reveal';
import {
  DELIVERY_TIME_SLOTS,
  getMinSpecificDeliveryTimeForDate,
  getSpecificDeliveryTimeInvalidReason,
  isDeliveryDateSelectable,
  isDeliveryTimeSlotSelectableForDate,
  isSpecificDeliveryTime,
  type SpecificDeliveryTimeInvalidReason,
} from '@/lib/deliveryTimeSelection';
import {
  resolveDeliveryConstraintNotice,
  type DeliveryConstraint,
} from '@/lib/delivery/deliveryConstraints';
import { formatYmdLocalizedForPdp } from '@/lib/delivery/pdpDeliveryTiming';
import { getBangkokYmd, getShopTodayYmd, formatMinutesAsClockTime, DELIVERY_WINDOW_START_MIN } from '@/lib/deliveryHours';

const CLOCK_TICK_MS = 30_000;
const SHAKE_MS = 420;

const MORNING_SLOT = DELIVERY_TIME_SLOTS[0];
const MIDDAY_SLOT = DELIVERY_TIME_SLOTS[1];
const EVENING_SLOT = DELIVERY_TIME_SLOTS[2];

function buildTimeRestrictionHint({
  lang,
  date,
  constraint,
  constraintLoading,
  orderingBlocked,
  anyWindowOk,
  someWindowBlocked,
  liveNow,
}: {
  lang: Locale;
  date: string;
  constraint: DeliveryConstraint | null;
  constraintLoading: boolean;
  orderingBlocked: boolean;
  anyWindowOk: boolean;
  someWindowBlocked: boolean;
  liveNow: Date;
}): string | null {
  const t = translations[lang].premiumCheckout as {
    deliveryTimePickDateFirst?: string;
    deliveryTimeLoadingHint?: string;
    deliveryTimeOrderingBlockedHint?: string;
    deliveryTimeDateNotAllowedHint?: string;
    deliveryTimeNoSlotsHint?: string;
    deliveryTimeSomeSlotsPassedHint?: string;
  };

  if (constraintLoading) {
    return (
      t.deliveryTimeLoadingHint ??
      'Checking delivery availability for your area and items…'
    );
  }

  if (!date) {
    return (
      t.deliveryTimePickDateFirst ??
      'Choose a delivery date first to see available times.'
    );
  }

  if (orderingBlocked) {
    return (
      (constraint ? resolveDeliveryConstraintNotice(constraint, lang) : null) ||
      t.deliveryTimeOrderingBlockedHint ||
      'Ordering is not available for this delivery area right now.'
    );
  }

  if (constraint?.earliestYmd && date < constraint.earliestYmd) {
    const dateLabel = formatYmdLocalizedForPdp(constraint.earliestYmd, lang);
    const template =
      t.deliveryTimeDateNotAllowedHint ??
      'This date is not available. Earliest delivery is {date}.';
    return template.replace('{date}', dateLabel);
  }

  if (!isDeliveryDateSelectable(date, liveNow, constraint)) {
    const template =
      t.deliveryTimeDateNotAllowedHint ??
      'This date is not available. Earliest delivery is {date}.';
    const floor = constraint?.earliestYmd || getShopTodayYmd();
    return template.replace('{date}', formatYmdLocalizedForPdp(floor, lang));
  }

  if (!anyWindowOk) {
    return (
      t.deliveryTimeNoSlotsHint ??
      'No delivery time windows are left for this date. Please choose another date.'
    );
  }

  if (someWindowBlocked && date === getBangkokYmd(liveNow)) {
    return (
      t.deliveryTimeSomeSlotsPassedHint ??
      'Some time windows have already passed for today — choose a later window, a custom time at least 1 hour from now, or another date.'
    );
  }

  return null;
}

function messageForInvalidReason(
  reason: SpecificDeliveryTimeInvalidReason,
  copy: {
    specificTimeTooSoon?: string;
    specificTimeBeforeOpen?: string;
    specificTimeAfterHours?: string;
    specificTimeDateBlocked?: string;
    specificTimeInvalid?: string;
  },
  minSpecificTime: string
): string {
  switch (reason) {
    case 'before_open':
      return copy.specificTimeBeforeOpen ?? `This time is before delivery hours. Earliest is ${formatMinutesAsClockTime(DELIVERY_WINDOW_START_MIN)}.`;
    case 'after_hours':
      return copy.specificTimeAfterHours ?? 'This time is outside delivery hours. Latest is 19:59.';
    case 'date_blocked':
      return copy.specificTimeDateBlocked ?? 'This delivery date is not available for a custom time.';
    case 'too_soon':
    default:
      return (copy.specificTimeTooSoon ?? copy.specificTimeInvalid ?? 'Choose {time} or later.').replace(
        '{time}',
        minSpecificTime
      );
  }
}

export function DeliveryTimeSelector({
  lang,
  date,
  timeSlot,
  deliveryTimeMode = 'window',
  onChange,
  constraint = null,
  constraintLoading = false,
}: {
  lang: Locale;
  date: string;
  timeSlot: string;
  deliveryTimeMode?: 'window' | 'custom';
  onChange: (timeSlot: string, mode: 'window' | 'custom') => void;
  constraint?: DeliveryConstraint | null;
  /** While true, time tiles stay disabled (date floor may still be loading). */
  constraintLoading?: boolean;
}) {
  const t = translations[lang].premiumCheckout;
  const [now, setNow] = useState<Date | null>(null);
  const [shake, setShake] = useState(false);
  const customOpen = deliveryTimeMode === 'custom';
  const orderingBlocked =
    constraintLoading || (constraint != null && !constraint.orderingAllowed);

  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), CLOCK_TICK_MS);
    return () => window.clearInterval(id);
  }, []);

  const liveNow = now ?? new Date();
  const specificInputValue = isSpecificDeliveryTime(timeSlot) ? timeSlot : '';
  const minSpecificTime = date ? getMinSpecificDeliveryTimeForDate(date, liveNow) : formatMinutesAsClockTime(DELIVERY_WINDOW_START_MIN);
  const invalidReason =
    customOpen && date && specificInputValue
      ? getSpecificDeliveryTimeInvalidReason(date, specificInputValue, liveNow, constraint)
      : null;
  const customTimeInvalid = invalidReason != null;
  const customTimeValid =
    customOpen && Boolean(date) && Boolean(specificInputValue) && !customTimeInvalid;

  useEffect(() => {
    if (!customTimeInvalid || !specificInputValue) {
      setShake(false);
      return;
    }
    setShake(false);
    const frame = window.requestAnimationFrame(() => setShake(true));
    const timer = window.setTimeout(() => setShake(false), SHAKE_MS);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [customTimeInvalid, specificInputValue, invalidReason]);

  const morningOk =
    !orderingBlocked &&
    Boolean(date) &&
    isDeliveryTimeSlotSelectableForDate(date, MORNING_SLOT, liveNow, constraint);
  const middayOk =
    !orderingBlocked &&
    Boolean(date) &&
    isDeliveryTimeSlotSelectableForDate(date, MIDDAY_SLOT, liveNow, constraint);
  const eveningOk =
    !orderingBlocked &&
    Boolean(date) &&
    isDeliveryTimeSlotSelectableForDate(date, EVENING_SLOT, liveNow, constraint);

  const anyWindowOk = morningOk || middayOk || eveningOk;
  const someWindowBlocked = !morningOk || !middayOk || !eveningOk;

  const restrictionHint = buildTimeRestrictionHint({
    lang,
    date,
    constraint,
    constraintLoading,
    orderingBlocked,
    anyWindowOk,
    someWindowBlocked,
    liveNow,
  });

  const selectWindow = (slot: string) => {
    onChange(slot, 'window');
  };

  const openCustom = () => {
    onChange('', 'custom');
  };

  const handleSpecificInput = (value: string) => {
    onChange(value, 'custom');
  };

  const customInvalidMessage = invalidReason
    ? messageForInvalidReason(invalidReason, t, minSpecificTime)
    : '';
  const customValidMessage =
    (t as { specificTimeValid?: string }).specificTimeValid ?? 'This delivery time works.';

  return (
    <div className="delivery-time-selector">
      {restrictionHint ? (
        <p className="delivery-time-selector__status" role="status">
          {restrictionHint}
        </p>
      ) : null}

      <div className="delivery-time-selector__tiles" role="group" aria-label={t.deliveryTimeTitle}>
        <SelectionTile
          compact
          disabled={!morningOk}
          selected={!customOpen && timeSlot === MORNING_SLOT && morningOk}
          title={t.morningTile}
          subtitle={t.morningSub}
          onClick={() => selectWindow(MORNING_SLOT)}
        />
        <SelectionTile
          compact
          disabled={!middayOk}
          selected={!customOpen && timeSlot === MIDDAY_SLOT && middayOk}
          title={t.afternoonTile}
          subtitle={t.afternoonSub}
          onClick={() => selectWindow(MIDDAY_SLOT)}
        />
        <SelectionTile
          compact
          disabled={!eveningOk}
          selected={!customOpen && timeSlot === EVENING_SLOT && eveningOk}
          title={t.eveningTile}
          subtitle={t.eveningSub}
          onClick={() => selectWindow(EVENING_SLOT)}
        />
        <SelectionTile
          compact
          disabled={orderingBlocked || !date || !isDeliveryDateSelectable(date, liveNow, constraint)}
          selected={
            customOpen &&
            !orderingBlocked &&
            Boolean(date) &&
            isDeliveryDateSelectable(date, liveNow, constraint)
          }
          title={t.customTimeTile}
          subtitle={t.customTimeSub}
          onClick={openCustom}
        />
      </div>

      <OverlayReveal
        open={
          customOpen &&
          !orderingBlocked &&
          Boolean(date) &&
          isDeliveryDateSelectable(date, liveNow, constraint)
        }
        className="delivery-time-selector__custom"
      >
        <div className="delivery-time-selector__custom-inner">
          <label className="delivery-time-selector__hint" htmlFor="delivery-specific-time">
            {t.specificTimeHint}
          </label>
          <input
            id="delivery-specific-time"
            type="time"
            className={[
              'delivery-time-selector__input',
              customTimeInvalid ? 'delivery-time-selector__input--invalid' : '',
              customTimeValid ? 'delivery-time-selector__input--valid' : '',
              shake ? 'delivery-time-selector__input--shake' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            value={specificInputValue}
            onChange={(e) => handleSpecificInput(e.target.value)}
            aria-label={t.specificTimeInputLabel}
            aria-invalid={customTimeInvalid}
            aria-describedby={
              customTimeInvalid
                ? 'delivery-specific-time-error'
                : customTimeValid
                  ? 'delivery-specific-time-ok'
                  : 'delivery-specific-time-min'
            }
            required={customOpen && !orderingBlocked}
            disabled={orderingBlocked}
          />
          <p id="delivery-specific-time-min" className="delivery-time-selector__sr-only">
            {(
              (t as { specificTimeMinHint?: string }).specificTimeMinHint ??
              'Earliest allowed time for this date: {time}.'
            ).replace('{time}', minSpecificTime)}
          </p>
          {customTimeInvalid ? (
            <p
              id="delivery-specific-time-error"
              className="delivery-time-selector__error"
              role="alert"
            >
              {customInvalidMessage}
            </p>
          ) : null}
          {customTimeValid ? (
            <p
              id="delivery-specific-time-ok"
              className="delivery-time-selector__ok"
              role="status"
            >
              {customValidMessage}
            </p>
          ) : null}
        </div>
      </OverlayReveal>

      <style jsx>{`
        .delivery-time-selector__status {
          margin: 0 0 10px;
          padding: 10px 12px;
          border-radius: 12px;
          font-size: 13px;
          line-height: 1.45;
          font-weight: 500;
          color: var(--text);
          background: var(--surface);
          border: 1px solid var(--border);
        }
        .delivery-time-selector__tiles {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
        }
        :global(.delivery-time-selector__custom.ui-overlay-reveal--open) {
          margin-top: 10px;
        }
        :global(
          .delivery-time-selector__custom.ui-overlay-reveal--open
            .ui-overlay-reveal__inner
        ) {
          overflow: visible;
        }
        .delivery-time-selector__custom-inner {
          display: flex;
          flex-direction: column;
          gap: 8px;
          /* Room for focus / valid / invalid rings (clipped by overlay otherwise). */
          padding: 3px;
          margin: -3px;
        }
        .delivery-time-selector__hint {
          margin: 0;
          font-size: 14px;
          font-weight: 600;
          color: var(--text);
          line-height: 1.4;
        }
        .delivery-time-selector__sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
        }
        .delivery-time-selector__input {
          width: 100%;
          max-width: 140px;
          padding: 8px 10px;
          border: 1.5px solid var(--border);
          border-radius: 10px;
          font-size: 15px;
          font-family: inherit;
          background: var(--surface);
          box-sizing: border-box;
          color: var(--text);
          transition: border-color 0.15s, box-shadow 0.15s, background 0.15s, color 0.15s;
        }
        .delivery-time-selector__input:focus {
          outline: none;
          border-color: color-mix(in srgb, var(--accent) 45%, var(--border));
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent-soft) 70%, transparent);
        }
        /* Soften native time-field segment highlight (often a bright system orange). */
        .delivery-time-selector__input::-webkit-datetime-edit-hour-field:focus,
        .delivery-time-selector__input::-webkit-datetime-edit-minute-field:focus,
        .delivery-time-selector__input::-webkit-datetime-edit-second-field:focus,
        .delivery-time-selector__input::-webkit-datetime-edit-ampm-field:focus {
          background: var(--accent-soft);
          color: var(--text);
          outline: none;
          border-radius: 4px;
        }
        .delivery-time-selector__input::selection {
          background: color-mix(in srgb, var(--accent-soft) 90%, var(--accent));
          color: var(--text);
        }
        .delivery-time-selector__input--invalid {
          border-color: #dc2626;
          background: #fef2f2;
          box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.16);
          color: #991b1b;
        }
        .delivery-time-selector__input--invalid:focus {
          border-color: #dc2626;
          box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.16);
        }
        .delivery-time-selector__input--valid {
          border-color: #16a34a;
          background: #f0fdf4;
          box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.16);
          color: #166534;
        }
        .delivery-time-selector__input--valid:focus {
          border-color: #16a34a;
          box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.16);
        }
        .delivery-time-selector__input--shake {
          animation: delivery-time-input-shake ${SHAKE_MS}ms ease-in-out;
        }
        @keyframes delivery-time-input-shake {
          0%,
          100% {
            transform: translateX(0);
          }
          20% {
            transform: translateX(-5px);
          }
          40% {
            transform: translateX(5px);
          }
          60% {
            transform: translateX(-4px);
          }
          80% {
            transform: translateX(3px);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .delivery-time-selector__input--shake {
            animation: none;
          }
        }
        .delivery-time-selector__error {
          margin: 0;
          font-size: 13px;
          font-weight: 600;
          color: #b91c1c;
          line-height: 1.35;
        }
        .delivery-time-selector__ok {
          margin: 0;
          font-size: 13px;
          font-weight: 600;
          color: #15803d;
          line-height: 1.35;
        }
        @media (min-width: 401px) {
          .delivery-time-selector__tiles {
            grid-template-columns: repeat(4, minmax(0, 1fr));
          }
        }
        @media (max-width: 400px) {
          .delivery-time-selector__tiles {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
      `}</style>
    </div>
  );
}
