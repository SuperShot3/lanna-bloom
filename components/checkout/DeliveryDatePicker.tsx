'use client';

import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  addMonths,
  subMonths,
  format,
  isSameDay,
  isBefore,
  startOfDay,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
} from 'date-fns';
import { enUS, ru, th, zhCN, zhHK } from 'date-fns/locale';
import type { Locale } from '@/lib/i18n';
import { translations } from '@/lib/i18n';
import { cn } from '@/lib/utils';

function ymdToDate(ymd: string): Date {
  return startOfDay(new Date(`${ymd}T12:00:00`));
}

function toDateValue(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

function dateFnsLocale(lang: Locale) {
  switch (lang) {
    case 'th':
      return th;
    case 'ru':
      return ru;
    case 'zh-sg':
      return zhCN;
    case 'zh-hk':
      return zhHK;
    default:
      return enUS;
  }
}

/** Sunday-start week, three-character weekday headers */
const WEEKDAY_LABELS_3: Record<Locale, readonly string[]> = {
  en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  th: ['อาท', 'จัน', 'อัง', 'พุธ', 'พฤห', 'ศุก', 'เสา'],
  ru: ['Вск', 'Пнд', 'Втр', 'Срд', 'Чтв', 'Птн', 'Сбт'],
  'zh-sg': ['周日', '周一', '周二', '周三', '周四', '周五', '周六'],
  'zh-hk': ['週日', '週一', '週二', '週三', '週四', '週五', '週六'],
};

const DELIVERY_EMOJI = '📦🚚💨';
export type DeliveryDatePickerProps = {
  value: string;
  onChange: (ymd: string) => void;
  minDate?: string;
  lang?: Locale;
  className?: string;
  id?: string;
  /** Dense layout for mobile popover / inline custom date. */
  compact?: boolean;
};

export function DeliveryDatePicker({
  value,
  onChange,
  minDate,
  lang = 'en',
  className,
  id,
  compact = false,
}: DeliveryDatePickerProps) {
  const locale = dateFnsLocale(lang);
  const weekdays = WEEKDAY_LABELS_3[lang] ?? WEEKDAY_LABELS_3.en;
  const deliveryOnLabel =
    translations[lang].premiumCheckout?.deliveryOnLabel ??
    translations.en.premiumCheckout.deliveryOnLabel;

  const today = startOfDay(new Date());
  const safeMinDate = minDate ? ymdToDate(minDate) : today;

  const valueDate = value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? ymdToDate(value) : null;

  const [selectedDate, setSelectedDate] = React.useState<Date | null>(valueDate);
  const [currentMonth, setCurrentMonth] = React.useState<Date>(valueDate ?? safeMinDate);

  React.useEffect(() => {
    const next =
      value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? ymdToDate(value) : null;
    setSelectedDate(next);
    if (next) {
      setCurrentMonth(next);
    }
  }, [value]);

  const days = React.useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const emptySlots = Array.from({ length: getDay(monthStart) }, () => null);
    return [...emptySlots, ...eachDayOfInterval({ start: monthStart, end: monthEnd })];
  }, [currentMonth]);

  const handleSelect = (date: Date) => {
    const normalized = startOfDay(date);
    if (isBefore(normalized, safeMinDate)) return;
    setSelectedDate(normalized);
    onChange(toDateValue(normalized));
  };

  const canGoPreviousMonth = !isBefore(
    startOfMonth(subMonths(currentMonth, 1)),
    startOfMonth(safeMinDate)
  );

  const selectedLabel =
    selectedDate &&
    format(
      selectedDate,
      lang === 'th' ? 'EEEEที่ d MMM yyyy' : 'EEE, MMM d, yyyy',
      { locale }
    );

  return (
    <div
      id={id}
      role="dialog"
      aria-label={lang === 'th' ? 'เลือกวันจัดส่ง' : 'Choose delivery date'}
      className={cn(
        'relative w-full border border-border bg-background shadow-sm',
        compact
          ? 'rounded-xl p-2.5 max-w-[280px]'
          : 'rounded-2xl p-4 max-w-sm',
        className
      )}
    >
      <div
        role="group"
        aria-label={
          selectedLabel
            ? `${deliveryOnLabel}: ${selectedLabel}`
            : format(currentMonth, 'MMMM yyyy', { locale })
        }
        className={cn(
          'flex items-center justify-between gap-1 border-b border-border/70',
          compact ? 'mb-2 pb-2' : 'mb-4 pb-3'
        )}
      >
        <button
          type="button"
          disabled={!canGoPreviousMonth}
          onClick={() => setCurrentMonth((month) => subMonths(month, 1))}
          className={cn(
            'flex shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-secondary hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30',
            compact ? 'h-7 w-7' : 'h-9 w-9'
          )}
          aria-label={lang === 'th' ? 'เดือนก่อนหน้า' : 'Previous month'}
        >
          <ChevronLeft className={compact ? 'h-4 w-4' : 'h-5 w-5'} aria-hidden />
        </button>

        <p
          className={cn(
            'min-w-0 flex-1 overflow-hidden text-center leading-snug',
            compact ? 'text-[10px]' : 'text-xs sm:text-sm'
          )}
          role="status"
          aria-live="polite"
        >
          <span className="mr-0.5" aria-hidden>
            {DELIVERY_EMOJI}
          </span>
          {selectedLabel ? (
            <>
              <span className="font-medium text-muted-foreground">{deliveryOnLabel}: </span>
              <span className="font-[780] text-primary">{selectedLabel}</span>
            </>
          ) : (
            <span className="font-medium text-muted-foreground">{deliveryOnLabel}</span>
          )}
        </p>

        <button
          type="button"
          onClick={() => setCurrentMonth((month) => addMonths(month, 1))}
          className={cn(
            'flex shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-secondary hover:text-foreground',
            compact ? 'h-7 w-7' : 'h-9 w-9'
          )}
          aria-label={lang === 'th' ? 'เดือนถัดไป' : 'Next month'}
        >
          <ChevronRight className={compact ? 'h-4 w-4' : 'h-5 w-5'} aria-hidden />
        </button>
      </div>

      <div
        role="row"
        className={cn(
          'grid grid-cols-7 text-center font-bold tracking-wide',
          'rounded-lg bg-secondary text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]',
          compact
            ? 'mb-1 px-0.5 py-1 text-[9px] sm:text-[10px]'
            : 'mb-1.5 px-0.5 py-1.5 text-[11px] sm:text-xs'
        )}
      >
        {weekdays.map((day, i) => (
          <div
            key={`${day}-${i}`}
            role="columnheader"
            className="leading-none tabular-nums"
            title={format(
              new Date(2024, 0, 7 + i),
              'EEEE',
              { locale }
            )}
          >
            {day}
          </div>
        ))}
      </div>

      <div className={cn('grid grid-cols-7', compact ? 'mt-0.5 gap-0' : 'mt-1 gap-1')}>
        {days.map((date, index) => {
          if (!date) {
            return (
              <div
                key={`empty-${index}`}
                className={compact ? 'h-8' : 'h-10'}
                aria-hidden
              />
            );
          }

          const normalized = startOfDay(date);
          const isSelected = selectedDate !== null && isSameDay(normalized, selectedDate);
          const isDisabled = isBefore(normalized, safeMinDate);
          const isToday = isSameDay(normalized, today);

          return (
            <button
              key={toDateValue(normalized)}
              type="button"
              disabled={isDisabled}
              onClick={() => handleSelect(normalized)}
              className={cn(
                'relative flex items-center justify-center rounded-full transition',
                compact ? 'mx-auto h-8 w-8 text-xs' : 'h-10 text-sm',
                isSelected && 'bg-primary text-primary-foreground font-[780]',
                !isSelected &&
                  !isDisabled &&
                  'text-foreground hover:bg-secondary hover:text-primary',
                isDisabled && 'cursor-not-allowed text-muted-foreground/40'
              )}
              aria-pressed={isSelected}
              aria-label={format(normalized, 'EEEE, MMMM d, yyyy', { locale })}
            >
              {format(normalized, 'd')}
              {isToday && !isSelected && !isDisabled && (
                <span
                  className={cn(
                    'absolute rounded-full bg-accent',
                    compact ? 'bottom-1 h-0.5 w-0.5' : 'bottom-1.5 h-1 w-1'
                  )}
                  aria-hidden
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
