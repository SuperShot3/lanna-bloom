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
  /** While true, Today is not selectable (avoid fail-open before province/catalog load). */
  constraintLoading?: boolean;
};

export function DeliveryDateSelector({
  lang,
  value,
  onChange,
  className = '',
  pickerClassName = '',
  constraint = null,
  constraintLoading = false,
}: DeliveryDateSelectorProps) {
  const t = translations[lang].premiumCheckout;
  const todayStr = getShopTodayYmd();
  const tomorrowStr = getShopTomorrowYmd();
  const orderingBlocked = constraint != null && !constraint.orderingAllowed;
  const earliestFloor =
    !orderingBlocked && constraint?.earliestYmd && constraint.earliestYmd > todayStr
      ? constraint.earliestYmd
      : null;
  const minDate = constraintLoading
    ? tomorrowStr
    : earliestFloor ?? todayStr;
  const todaySelectable =
    !constraintLoading &&
    !orderingBlocked &&
    !earliestFloor &&
    getSelectableDeliveryTimeSlotsForDate(todayStr, new Date(), constraint).length > 0;
  const tomorrowSelectable =
    !orderingBlocked &&
    (!earliestFloor || tomorrowStr >= earliestFloor) &&
    getSelectableDeliveryTimeSlotsForDate(tomorrowStr, new Date(), constraint).length > 0;
  const customBlocked = orderingBlocked || constraintLoading;

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

  // Snap off Today (or any date before the floor) once constraint is known.
  useEffect(() => {
    if (constraintLoading || orderingBlocked) return;
    if (!value) return;
    if (value === todayStr && !todaySelectable) {
      onChange(minDate);
      return;
    }
    if (earliestFloor && value < earliestFloor) {
      onChange(earliestFloor);
    }
    // onChange is intentionally omitted — parent often passes an inline lambda.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- snap only when value/constraint changes
  }, [
    constraintLoading,
    orderingBlocked,
    value,
    todayStr,
    todaySelectable,
    minDate,
    earliestFloor,
  ]);

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
          className="co-tile--date"
          disabled={!todaySelectable}
          selected={dateMode === 'today' && todaySelectable}
          title={t.todayTile}
          onClick={selectToday}
        />
        <SelectionTile
          compact
          className="co-tile--date"
          disabled={!tomorrowSelectable}
          selected={dateMode === 'tomorrow' && tomorrowSelectable}
          title={t.tomorrowTile}
          onClick={selectTomorrow}
        />
        <SelectionTile
          compact
          className="co-tile--date"
          disabled={customBlocked}
          selected={dateMode === 'custom' && !customBlocked}
          title={t.chooseDateTile}
          onClick={openCustomCalendar}
        />
      </div>

      <OverlayReveal
        open={calendarOpen && !customBlocked}
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
