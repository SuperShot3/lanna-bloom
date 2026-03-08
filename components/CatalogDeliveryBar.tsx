'use client';

import { useState } from 'react';
import type { Locale } from '@/lib/i18n';
import { translations } from '@/lib/i18n';

export interface CatalogDeliveryBarProps {
  lang: Locale;
  /** Initial delivery date (YYYY-MM-DD) */
  initialDate?: string;
  /** Callback when date changes (for URL param) */
  onDateChange?: (date: string) => void;
}

function formatDateForInput(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function CatalogDeliveryBar({
  lang,
  initialDate,
  onDateChange,
}: CatalogDeliveryBarProps) {
  const t = translations[lang].catalog;
  const today = new Date();
  const minDate = formatDateForInput(today);
  const [date, setDate] = useState(initialDate ?? minDate);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setDate(v);
    onDateChange?.(v);
  };

  const isToday = date === minDate;

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 py-4 px-4 sm:px-6 bg-stone-100 rounded-xl border border-stone-200">
      <div className="flex items-center gap-3">
        <span className="material-symbols-outlined text-[#1A3C34]">
          location_on
        </span>
        <span className="font-medium text-stone-800">
          {t.deliveryBarTitle ?? 'Delivering to Chiang Mai, Thailand'}
        </span>
      </div>
      <div className="flex items-center gap-4">
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
        {isToday && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-700 text-sm font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            {t.availableToday ?? 'Available Today'}
          </span>
        )}
      </div>
    </div>
  );
}
