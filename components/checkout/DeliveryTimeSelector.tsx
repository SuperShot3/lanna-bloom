'use client';

import { useEffect, useState } from 'react';
import type { Locale } from '@/lib/i18n';
import { translations } from '@/lib/i18n';
import { SelectionTile } from '@/components/checkout/premium/SelectionTile';
import { OverlayReveal } from '@/components/ui/overlay-reveal';
import {
  DELIVERY_TIME_SLOTS,
  getMaxSpecificDeliveryTime,
  getMinSpecificDeliveryTimeForDate,
  isDeliveryTimeSlotSelectableForDate,
  isSpecificDeliveryTime,
} from '@/lib/deliveryTimeSelection';

const CLOCK_TICK_MS = 30_000;

const MORNING_SLOT = DELIVERY_TIME_SLOTS[0];
const MIDDAY_SLOT = DELIVERY_TIME_SLOTS[1];
const EVENING_SLOT = DELIVERY_TIME_SLOTS[2];

export function DeliveryTimeSelector({
  lang,
  date,
  timeSlot,
  onChange,
}: {
  lang: Locale;
  date: string;
  timeSlot: string;
  onChange: (timeSlot: string) => void;
}) {
  const t = translations[lang].premiumCheckout;
  const [now, setNow] = useState<Date | null>(null);
  const specificSelected = isSpecificDeliveryTime(timeSlot);
  const [customOpen, setCustomOpen] = useState(specificSelected);

  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), CLOCK_TICK_MS);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (specificSelected) setCustomOpen(true);
  }, [specificSelected]);

  const liveNow = now ?? new Date();
  const minSpecificTime = date ? getMinSpecificDeliveryTimeForDate(date, liveNow) : '09:00';
  const maxSpecificTime = getMaxSpecificDeliveryTime();
  const specificInputValue = specificSelected ? timeSlot : '';

  const morningOk =
    !date || isDeliveryTimeSlotSelectableForDate(date, MORNING_SLOT, liveNow);
  const middayOk =
    !date || isDeliveryTimeSlotSelectableForDate(date, MIDDAY_SLOT, liveNow);
  const eveningOk =
    !date || isDeliveryTimeSlotSelectableForDate(date, EVENING_SLOT, liveNow);

  const selectWindow = (slot: string) => {
    setCustomOpen(false);
    onChange(slot);
  };

  const openCustom = () => {
    setCustomOpen(true);
    if (!specificSelected) onChange('');
  };

  const handleSpecificInput = (value: string) => {
    if (!value) {
      onChange('');
      return;
    }
    if (isDeliveryTimeSlotSelectableForDate(date, value, liveNow)) {
      onChange(value);
    }
  };

  const specificInvalid =
    customOpen &&
    Boolean(specificInputValue) &&
    !isDeliveryTimeSlotSelectableForDate(date, specificInputValue, liveNow);

  return (
    <div className="delivery-time-selector">
      <div className="delivery-time-selector__tiles" role="group" aria-label={t.deliveryTimeTitle}>
        <SelectionTile
          compact
          selected={timeSlot === MORNING_SLOT}
          title={t.morningTile}
          subtitle={t.morningSub}
          onClick={() => morningOk && selectWindow(MORNING_SLOT)}
          className={!morningOk ? 'co-tile--disabled' : ''}
        />
        <SelectionTile
          compact
          selected={timeSlot === MIDDAY_SLOT}
          title={t.afternoonTile}
          subtitle={t.afternoonSub}
          onClick={() => middayOk && selectWindow(MIDDAY_SLOT)}
          className={!middayOk ? 'co-tile--disabled' : ''}
        />
        <SelectionTile
          compact
          selected={timeSlot === EVENING_SLOT}
          title={t.eveningTile}
          subtitle={t.eveningSub}
          onClick={() => eveningOk && selectWindow(EVENING_SLOT)}
          className={!eveningOk ? 'co-tile--disabled' : ''}
        />
        <SelectionTile
          compact
          selected={customOpen}
          title={t.customTimeTile}
          subtitle={t.customTimeSub}
          onClick={openCustom}
        />
      </div>

      <OverlayReveal open={customOpen} className="delivery-time-selector__custom">
        <div className="delivery-time-selector__custom-inner">
          <p className="delivery-time-selector__hint">{t.specificTimeHint}</p>
          <input
            id="delivery-specific-time"
            type="time"
            className={[
              'delivery-time-selector__input',
              specificInvalid ? 'delivery-time-selector__input--invalid' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            value={specificInputValue}
            min={minSpecificTime}
            max={maxSpecificTime}
            onChange={(e) => handleSpecificInput(e.target.value)}
            aria-label={t.specificTimeInputLabel}
            aria-invalid={specificInvalid}
          />
          {specificInvalid && (
            <p className="delivery-time-selector__error" role="alert">
              {t.specificTimeInvalid.replace('{time}', minSpecificTime)}
            </p>
          )}
        </div>
      </OverlayReveal>

      <style jsx>{`
        .delivery-time-selector__tiles {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
        }
        :global(.delivery-time-selector__custom.ui-overlay-reveal--open) {
          margin-top: 10px;
        }
        .delivery-time-selector__custom-inner {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .delivery-time-selector__hint {
          margin: 0;
          font-size: 12px;
          color: var(--text-muted);
          line-height: 1.4;
        }
        .delivery-time-selector__input {
          width: 100%;
          max-width: 140px;
          padding: 8px 10px;
          border: 1px solid var(--border);
          border-radius: 10px;
          font-size: 15px;
          font-family: inherit;
          background: #fff;
          box-sizing: border-box;
        }
        .delivery-time-selector__input--invalid {
          border-color: #dc2626;
        }
        .delivery-time-selector__error {
          margin: 0;
          font-size: 12px;
          color: #b91c1c;
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
