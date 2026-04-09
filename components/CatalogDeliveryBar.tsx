'use client';

import { useState, useEffect } from 'react';
import type { Locale } from '@/lib/i18n';
import { translations } from '@/lib/i18n';
import {
  getBangkokYmd,
  getSameDayDeliveryPhaseBangkok,
  getTomorrowBangkokDisplayDate,
  formatBangkokTime,
} from '@/lib/deliveryHours';

export interface CatalogDeliveryBarProps {
  lang: Locale;
  /** Initial delivery date (YYYY-MM-DD) */
  initialDate?: string;
  /** Callback when date changes (for URL param) */
  onDateChange?: (date: string) => void;
}

const CLOCK_TICK_MS = 30_000;

export function CatalogDeliveryBar({
  lang,
  initialDate,
  onDateChange,
}: CatalogDeliveryBarProps) {
  const t = translations[lang].catalog;
  const [now, setNow] = useState(() => new Date());

  const minDate = getBangkokYmd(now);
  const [date, setDate] = useState(() => initialDate ?? minDate);

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), CLOCK_TICK_MS);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    setDate((d) => (d < minDate ? minDate : d));
  }, [minDate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setDate(v);
    onDateChange?.(v);
  };

  const isToday = date === minDate;
  const phase = getSameDayDeliveryPhaseBangkok(now);

  const sameDayBadgeLine =
    phase === 'before'
      ? t.deliverySameDayOpens ?? 'Same-day from 08:00 today'
      : t.deliverySameDayNext?.replace(
          '{date}',
          getTomorrowBangkokDisplayDate(now, lang),
        ) ?? 'Next same-day from 08:00';

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 py-4 px-4 sm:px-6 bg-stone-100 rounded-xl border border-stone-200">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-[#1A3C34]">
            location_on
          </span>
          <span className="font-medium text-stone-800">
            {t.deliveryBarTitle ?? 'Delivering to Chiang Mai, Thailand'}
          </span>
        </div>
        <div
          className="flex items-center gap-2 text-sm text-stone-600"
          title={
            lang === 'th'
              ? 'เวลาท้องถิ่น (เชียงใหม่)'
              : 'Local time (Asia/Bangkok)'
          }
        >
          <span className="material-symbols-outlined text-[18px] text-stone-500">
            schedule
          </span>
          <time dateTime={now.toISOString()}>
            {formatBangkokTime(now, lang)}
          </time>
          <span className="text-stone-400">{t.localTimeBangkok ?? 'Chiang Mai'}</span>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm">
          <span className="text-stone-500">{t.deliveryDate ?? 'Delivery date'}:</span>
          <input
            type="date"
            value={date}
            min={minDate}
            onChange={handleChange}
            className="px-3 py-2 rounded-lg border border-stone-300 bg-white text-stone-800 text-sm"
          />
        </label>
        {isToday && phase === 'open' && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-700 text-sm font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500" aria-hidden />
            {t.availableToday ?? 'Available Today'}
          </span>
        )}
        {isToday && phase !== 'open' && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-stone-200 text-stone-600 text-sm font-medium max-w-[min(100%,320px)]">
            <span className="w-2 h-2 rounded-full bg-stone-400 shrink-0" aria-hidden />
            <span className="leading-snug">{sameDayBadgeLine}</span>
          </span>
        )}
      </div>
    </div>
  );
}
