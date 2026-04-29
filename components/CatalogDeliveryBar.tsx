'use client';

import { useRef, useState, useEffect } from 'react';
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
const DELIVERY_START_TIME = '09:00';
const DELIVERY_END_TIME = '20:00';

function formatDeliveryDate(ymd: string, lang: Locale): string {
  const date = new Date(`${ymd}T12:00:00+07:00`);
  return date.toLocaleDateString(lang === 'th' ? 'th-TH' : 'en-GB', {
    timeZone: 'Asia/Bangkok',
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function replaceTime(template: string, time: string): string {
  return template.replace('{time}', time);
}

export function CatalogDeliveryBar({
  lang,
  initialDate,
  onDateChange,
}: CatalogDeliveryBarProps) {
  const t = translations[lang].catalog;
  const [now, setNow] = useState(() => new Date());
  const dateInputRef = useRef<HTMLInputElement>(null);

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
  const tomorrowDate = getTomorrowBangkokDisplayDate(now, lang);

  const sameDayBadgeLine =
    phase === 'before'
      ? t.deliverySameDayOpens ?? 'Same-day from 09:00 today'
      : t.deliverySameDayNext?.replace(
          '{date}',
          tomorrowDate,
        ) ?? 'Next same-day from 09:00';

  const todayStatus =
    phase === 'before'
      ? replaceTime(t.availableFrom ?? 'Available from {time}', DELIVERY_START_TIME)
      : phase === 'open'
        ? replaceTime(t.availableUntil ?? 'Available until {time}', DELIVERY_END_TIME)
        : t.closedForSameDay ?? 'Closed for same-day';
  const todayStatusTone = phase === 'open' ? 'open' : phase === 'after' ? 'closed' : 'pending';
  const tomorrowStatus = replaceTime(t.availableFrom ?? 'Available from {time}', DELIVERY_START_TIME);
  const todayLabel = t.todayLabel ?? 'Today';
  const tomorrowLabel = `${t.tomorrowLabel ?? 'Tomorrow'}, ${tomorrowDate}`;

  return (
    <section
      className="catalog-delivery-card"
      aria-label={t.deliveryBarTitle ?? 'Delivering to Chiang Mai, Thailand'}
    >
      <div className="catalog-delivery-row catalog-delivery-row-top">
        <div className="catalog-delivery-main">
          <span className="material-symbols-outlined catalog-delivery-icon catalog-delivery-icon-location" aria-hidden>
            location_on
          </span>
          <span className="catalog-delivery-location">
            {t.deliveryLocationShort ?? 'Chiang Mai, Thailand'}
          </span>
        </div>
        <div
          className="catalog-delivery-clock"
          title={
            lang === 'th'
              ? 'เวลาท้องถิ่น (เชียงใหม่)'
              : 'Local time (Asia/Bangkok)'
          }
        >
          <time dateTime={now.toISOString()}>
            {formatBangkokTime(now, lang)}
          </time>
          <span>{lang === 'th' ? 'เวลาท้องถิ่น' : 'local'}</span>
        </div>
      </div>

      <div
        role="button"
        tabIndex={0}
        className="catalog-delivery-row catalog-delivery-date-row"
        onClick={() => dateInputRef.current?.showPicker?.()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            dateInputRef.current?.showPicker?.();
          }
        }}
      >
        <span className="catalog-delivery-main">
          <span className="material-symbols-outlined catalog-delivery-icon catalog-delivery-icon-date" aria-hidden>
            calendar_month
          </span>
          <span className="catalog-delivery-muted">{t.deliveryDate ?? 'Delivery date'}</span>
        </span>
        <span className="catalog-delivery-date-value">{formatDeliveryDate(date, lang)}</span>
        <input
          ref={dateInputRef}
          type="date"
          value={date}
          min={minDate}
          onChange={handleChange}
          className="catalog-delivery-date-input"
          aria-label={t.deliveryDate ?? 'Delivery date'}
          tabIndex={-1}
        />
      </div>

      <div className="catalog-delivery-status-list">
        <div className="catalog-delivery-status-row">
          <span className={`catalog-delivery-dot catalog-delivery-dot-${todayStatusTone}`} aria-hidden />
          <span className="catalog-delivery-muted catalog-delivery-today-label">{todayLabel}</span>
          <span className={`catalog-delivery-pill catalog-delivery-pill-${todayStatusTone}`}>
            {todayStatus}
          </span>
        </div>
        <div className="catalog-delivery-status-row">
          <span className="catalog-delivery-dot catalog-delivery-dot-open" aria-hidden />
          <span className="catalog-delivery-muted">{tomorrowLabel}</span>
          <span className="catalog-delivery-pill catalog-delivery-pill-open">
            {tomorrowStatus}
          </span>
        </div>
      </div>
      {isToday && phase !== 'open' && <span className="sr-only">{sameDayBadgeLine}</span>}

      <style jsx>{`
        .catalog-delivery-card {
          display: grid;
          grid-template-columns: minmax(180px, 0.9fr) minmax(220px, 1fr) minmax(300px, 1.25fr);
          align-items: stretch;
          width: 100%;
          max-width: 1040px;
          margin: 0 auto;
          overflow: hidden;
          border: 1px solid rgba(26, 60, 52, 0.13);
          border-radius: 13px;
          background: #fff;
          box-shadow: 0 12px 30px rgba(26, 60, 52, 0.1);
        }

        .catalog-delivery-row {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          width: 100%;
          min-height: 42px;
          padding: 8px 14px;
          border-bottom: 0;
        }

        .catalog-delivery-date-row {
          border: 0;
          border-left: 1px solid rgba(26, 60, 52, 0.12);
          background: transparent;
          font: inherit;
          text-align: left;
          cursor: pointer;
        }

        .catalog-delivery-date-row:hover,
        .catalog-delivery-date-row:focus-visible {
          background: rgba(197, 160, 89, 0.08);
          outline: none;
        }

        .catalog-delivery-main {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
        }

        .catalog-delivery-icon {
          flex: 0 0 auto;
          font-size: 19px;
          line-height: 1;
        }

        .catalog-delivery-icon-location {
          color: #2f7d68;
        }

        .catalog-delivery-icon-date {
          color: #2f6f94;
        }

        .catalog-delivery-location,
        .catalog-delivery-date-value {
          color: #1f2933;
          font-size: 13px;
          font-weight: 700;
          line-height: 1.25;
        }

        .catalog-delivery-clock,
        .catalog-delivery-muted {
          color: #6b7280;
          font-size: 12px;
          line-height: 1.25;
        }

        .catalog-delivery-clock {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          white-space: nowrap;
        }

        .catalog-delivery-clock time {
          color: #1f2933;
          font-size: 15px;
          font-weight: 800;
          letter-spacing: 0.01em;
        }

        .catalog-delivery-date-input {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          opacity: 0;
          pointer-events: none;
        }

        .catalog-delivery-status-list {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1px;
          padding: 5px 14px;
          border-left: 1px solid rgba(26, 60, 52, 0.12);
        }

        .catalog-delivery-status-row {
          display: grid;
          grid-template-columns: auto 1fr auto;
          align-items: center;
          gap: 8px;
          min-height: 20px;
        }

        .catalog-delivery-dot {
          width: 7px;
          height: 7px;
          border-radius: 999px;
        }

        .catalog-delivery-dot-open {
          background: #6cab3f;
        }

        .catalog-delivery-dot-closed {
          background: #ef4d55;
        }

        .catalog-delivery-dot-pending {
          background: #d8a444;
        }

        .catalog-delivery-pill {
          justify-self: end;
          border-radius: 999px;
          padding: 4px 8px;
          font-size: 11px;
          font-weight: 700;
          line-height: 1;
          white-space: nowrap;
        }

        .catalog-delivery-pill-open {
          background: #eef7e8;
          color: #4f7f25;
        }

        .catalog-delivery-pill-closed {
          background: #fff0f2;
          color: #a4414a;
        }

        .catalog-delivery-pill-pending {
          background: #fff7df;
          color: #8a6420;
        }

        .catalog-delivery-status-row .catalog-delivery-muted {
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .catalog-delivery-today-label {
          color: #1f2933;
          font-weight: 800;
        }

        @media (max-width: 640px) {
          .catalog-delivery-card {
            grid-template-columns: 1fr;
            max-width: 100%;
          }

          .catalog-delivery-row {
            border-bottom: 1px solid rgba(26, 60, 52, 0.12);
          }

          .catalog-delivery-date-row {
            border-left: 0;
          }

          .catalog-delivery-status-list {
            border-left: 0;
          }
        }

        @media (max-width: 520px) {
          .catalog-delivery-row {
            min-height: 36px;
            padding: 6px 10px;
            gap: 8px;
          }

          .catalog-delivery-status-list {
            padding: 4px 10px 6px;
          }

          .catalog-delivery-status-row {
            gap: 6px;
            min-height: 19px;
          }

          .catalog-delivery-location,
          .catalog-delivery-date-value {
            font-size: 12px;
          }

          .catalog-delivery-clock,
          .catalog-delivery-muted {
            font-size: 11px;
          }

          .catalog-delivery-clock time {
            font-size: 13px;
          }

          .catalog-delivery-icon {
            font-size: 17px;
          }

          .catalog-delivery-pill {
            padding: 3px 7px;
            font-size: 10.5px;
          }
        }
      `}</style>
    </section>
  );
}
