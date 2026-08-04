'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Locale } from '@/lib/i18n';
import { translations } from '@/lib/i18n';
import { getSelectableDeliveryTimeSlotsForDate } from '@/lib/deliveryTimeSelection';
import { getShopTodayYmd, getShopTomorrowYmd } from '@/lib/deliveryHours';
import type { DeliveryConstraint } from '@/lib/delivery/deliveryConstraints';
import { DeliveryDatePicker } from '@/components/checkout/DeliveryDatePicker';
import { SelectionTile } from '@/components/checkout/premium/SelectionTile';
import { OverlayReveal } from '@/components/ui/overlay-reveal';

export type DeliveryDateMode = 'today' | 'tomorrow' | 'custom' | null;

function inferDateMode(
  date: string,
  todayStr: string,
  tomorrowStr: string
): DeliveryDateMode {
  if (!date) return null;
  if (date === todayStr) return 'today';
  if (date === tomorrowStr) return 'tomorrow';
  return 'custom';
}

export type DeliveryDateSelectorProps = {
  lang: Locale;
  value: string;
  onChange: (ymd: string) => void;
  className?: string;
  pickerClassName?: string;
  /** Province/product delivery constraint (Feature 3). */
  constraint?: DeliveryConstraint | null;
};

export function DeliveryDateSelector({
  lang,
  value,
  onChange,
  className = '',
  pickerClassName = '',
  constraint = null,
}: DeliveryDateSelectorProps) {
  const t = translations[lang].premiumCheckout;
  const todayStr = getShopTodayYmd();
  const tomorrowStr = getShopTomorrowYmd();
  const orderingBlocked = constraint != null && !constraint.orderingAllowed;
  const minDate =
    !orderingBlocked && constraint?.earliestYmd && constraint.earliestYmd > todayStr
      ? constraint.earliestYmd
      : todayStr;
  const todaySelectable =
    !orderingBlocked &&
    getSelectableDeliveryTimeSlotsForDate(todayStr, new Date(), constraint).length > 0;
  const tomorrowSelectable =
    !orderingBlocked &&
    getSelectableDeliveryTimeSlotsForDate(tomorrowStr, new Date(), constraint).length > 0;

  const [dateMode, setDateMode] = useState<DeliveryDateMode>(() =>
    inferDateMode(value, todayStr, tomorrowStr)
  );
  const [calendarOpen, setCalendarOpen] = useState(
    () => inferDateMode(value, todayStr, tomorrowStr) === 'custom'
  );

  useEffect(() => {
    const mode = inferDateMode(value, todayStr, tomorrowStr);
    setDateMode(mode);
    setCalendarOpen(mode === 'custom');
  }, [value, todayStr, tomorrowStr]);

  const selectToday = useCallback(() => {
    setDateMode('today');
    setCalendarOpen(false);
    onChange(todayStr);
  }, [onChange, todayStr]);

  const selectTomorrow = useCallback(() => {
    setDateMode('tomorrow');
    setCalendarOpen(false);
    onChange(tomorrowStr);
  }, [onChange, tomorrowStr]);

  const openCustomCalendar = useCallback(() => {
    setDateMode('custom');
    setCalendarOpen(true);
  }, []);

  const pickerValue =
    calendarOpen &&
    dateMode === 'custom' &&
    (value === todayStr || value === tomorrowStr || !value)
      ? ''
      : value;

  return (
    <div className={`delivery-date-selector ${className}`.trim()}>
      <div className="delivery-date-selector__tiles">
        <SelectionTile
          compact
          className={['co-tile--date', !todaySelectable ? 'co-tile--disabled' : '']
            .filter(Boolean)
            .join(' ')}
          selected={dateMode === 'today'}
          title={t.todayTile}
          onClick={() => todaySelectable && selectToday()}
        />
        <SelectionTile
          compact
          className={['co-tile--date', !tomorrowSelectable ? 'co-tile--disabled' : '']
            .filter(Boolean)
            .join(' ')}
          selected={dateMode === 'tomorrow'}
          title={t.tomorrowTile}
          onClick={() => tomorrowSelectable && selectTomorrow()}
        />
        <SelectionTile
          compact
          className={['co-tile--date', orderingBlocked ? 'co-tile--disabled' : '']
            .filter(Boolean)
            .join(' ')}
          selected={dateMode === 'custom'}
          title={t.chooseDateTile}
          onClick={() => !orderingBlocked && openCustomCalendar()}
        />
      </div>

      <OverlayReveal
        open={calendarOpen && !orderingBlocked}
        className="delivery-date-selector__popover"
      >
        <DeliveryDatePicker
          compact
          lang={lang}
          value={pickerValue}
          minDate={minDate}
          onChange={(ymd) => {
            setDateMode('custom');
            onChange(ymd);
          }}
          className={pickerClassName}
        />
      </OverlayReveal>

      <style jsx>{`
        .delivery-date-selector__tiles {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 8px;
          align-items: stretch;
        }
        /* :global — class is on OverlayReveal root (keep display:grid from ui-overlay-reveal) */
        :global(.delivery-date-selector__popover) {
          width: 100%;
          margin: 0;
          max-height: 0;
          overflow: hidden;
        }
        :global(.delivery-date-selector__popover.ui-overlay-reveal--open) {
          max-height: none;
          margin-top: 12px;
        }
        :global(.delivery-date-selector__popover .ui-overlay-reveal__inner) {
          display: flex;
          justify-content: center;
        }
        :global(
          .delivery-date-selector__popover.ui-overlay-reveal--open
            .ui-overlay-reveal__inner
        ) {
          overflow: visible;
        }
      `}</style>
    </div>
  );
}
