'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Locale } from '@/lib/i18n';
import { translations } from '@/lib/i18n';
import { getSelectableDeliveryTimeSlotsForDate } from '@/lib/deliveryTimeSelection';
import { getShopTodayYmd, getShopTomorrowYmd } from '@/lib/deliveryHours';
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
};

export function DeliveryDateSelector({
  lang,
  value,
  onChange,
  className = '',
  pickerClassName = '',
}: DeliveryDateSelectorProps) {
  const t = translations[lang].premiumCheckout;
  const todayStr = getShopTodayYmd();
  const tomorrowStr = getShopTomorrowYmd();
  const todaySelectable = getSelectableDeliveryTimeSlotsForDate(todayStr).length > 0;

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
          className="co-tile--date"
          selected={dateMode === 'tomorrow'}
          title={t.tomorrowTile}
          onClick={selectTomorrow}
        />
        <SelectionTile
          compact
          className="co-tile--date"
          selected={dateMode === 'custom'}
          title={t.chooseDateTile}
          onClick={openCustomCalendar}
        />
      </div>

      <OverlayReveal
        open={calendarOpen}
        className="delivery-date-selector__popover"
      >
        <DeliveryDatePicker
          compact
          lang={lang}
          value={pickerValue}
          minDate={todayStr}
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
          padding-top: 4px;
        }
        @media (max-width: 400px) {
          .delivery-date-selector__tiles {
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 6px;
          }
          :global(.delivery-date-selector__popover.ui-overlay-reveal--open) {
            margin-top: 10px;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          :global(.delivery-date-selector__popover.ui-overlay-reveal--open) {
            margin-top: 12px;
          }
        }
      `}</style>
    </div>
  );
}
