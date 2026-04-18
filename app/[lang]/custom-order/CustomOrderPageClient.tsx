'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { translations } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';
import {
  FULL_PHONE_MAX,
  fullPhoneDigitsValid,
  getFullPhoneFieldHint,
  normalizeFullPhoneOnBlur,
  type FullPhoneHint,
} from '@/lib/phoneFieldHints';

const MAX_FILE_BYTES = 4 * 1024 * 1024;

function resolveFullPhoneHintMessage(
  hint: FullPhoneHint,
  tCo: Record<string, string>,
  tCart: Record<string, string>
): string {
  const key = hint.messageKey;
  if (key === 'contactPhoneDigitsOnly' || key === 'phoneHintLooksGood') {
    return tCart[key] ?? key;
  }
  return tCo[key] ?? key;
}

export function CustomOrderPageClient({ lang }: { lang: Locale }) {
  const t = translations[lang].customOrder;
  const tCo = t as Record<string, string>;
  const tCart = translations[lang].cart as Record<string, string>;
  const contactHref = `/${lang}/contact`;
  const [fileError, setFileError] = useState<string | null>(null);
  const [pickedFileName, setPickedFileName] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successOrderId, setSuccessOrderId] = useState<string | null>(null);
  const [recipientPhoneDigits, setRecipientPhoneDigits] = useState('');
  const [yourPhoneDigits, setYourPhoneDigits] = useState('');

  const [datePopoverOpen, setDatePopoverOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState(() => new Date().getFullYear());
  const [selectedDate, setSelectedDate] = useState<{
    day: number;
    month: number;
    year: number;
  } | null>(null);
  const datePickerRef = useRef<HTMLDivElement>(null);

  const years = useMemo(() => {
    const y = new Date().getFullYear();
    return [y, y + 1, y + 2];
  }, []);

  const monthOptions = useMemo(() => {
    const loc = lang === 'th' ? 'th-TH' : 'en-US';
    return Array.from({ length: 12 }, (_, i) => ({
      value: String(i + 1),
      label: new Intl.DateTimeFormat(loc, { month: 'long' }).format(new Date(2000, i, 1)),
    }));
  }, [lang]);

  const weekDayLabels = useMemo(() => {
    const loc = lang === 'th' ? 'th-TH' : 'en-US';
    const fmt = new Intl.DateTimeFormat(loc, { weekday: 'short' });
    return Array.from({ length: 7 }, (_, i) =>
      fmt.format(new Date(2024, 5, 2 + i))
    );
  }, [lang]);

  const calendarWeeks = useMemo(() => {
    const dim = new Date(calendarYear, calendarMonth + 1, 0).getDate();
    const first = new Date(calendarYear, calendarMonth, 1).getDay();
    const cells: (number | null)[] = [];
    for (let i = 0; i < first; i++) cells.push(null);
    for (let d = 1; d <= dim; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    const weeks: (number | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) {
      weeks.push(cells.slice(i, i + 7));
    }
    return weeks;
  }, [calendarMonth, calendarYear]);

  const occasionOptions = useMemo(
    () =>
      [
        { value: 'justBecause', label: t.occasionJustBecause },
        { value: 'birthday', label: t.occasionBirthday },
        { value: 'anniversary', label: t.occasionAnniversary },
        { value: 'romantic', label: t.occasionRomantic },
        { value: 'sympathy', label: t.occasionSympathy },
        { value: 'congrats', label: t.occasionCongrats },
        { value: 'getWell', label: t.occasionGetWell },
      ] as const,
    [t]
  );

  useEffect(() => {
    if (!datePopoverOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(e.target as Node)) {
        setDatePopoverOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDatePopoverOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [datePopoverOpen]);

  const openDatePicker = useCallback(() => {
    if (selectedDate) {
      setCalendarMonth(selectedDate.month - 1);
      setCalendarYear(selectedDate.year);
    } else {
      const n = new Date();
      setCalendarMonth(n.getMonth());
      setCalendarYear(n.getFullYear());
    }
    setDatePopoverOpen(true);
  }, [selectedDate]);

  const toggleDatePicker = useCallback(() => {
    if (datePopoverOpen) {
      setDatePopoverOpen(false);
    } else {
      openDatePicker();
    }
  }, [datePopoverOpen, openDatePicker]);

  const formatSelectedDateDisplay = useCallback(() => {
    if (!selectedDate) return t.pickDeliveryDate;
    const dd = String(selectedDate.day).padStart(2, '0');
    const mm = String(selectedDate.month).padStart(2, '0');
    return `${dd}/${mm}/${selectedDate.year}`;
  }, [selectedDate, t.pickDeliveryDate]);

  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) {
      setFileError(null);
      setPickedFileName(null);
      return;
    }
    if (f.size > MAX_FILE_BYTES) {
      setFileError(t.fileTooLarge);
      setPickedFileName(null);
      e.target.value = '';
      return;
    }
    setFileError(null);
    setPickedFileName(f.name);
  }, [t]);

  const recipientPhoneHint = getFullPhoneFieldHint(recipientPhoneDigits);
  const yourPhoneHint = getFullPhoneFieldHint(yourPhoneDigits);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitting(true);
    const form = e.currentTarget;
    const recipientNorm = normalizeFullPhoneOnBlur(
      recipientPhoneDigits.replace(/\D/g, '').slice(0, FULL_PHONE_MAX)
    );
    const yourNorm = normalizeFullPhoneOnBlur(
      yourPhoneDigits.replace(/\D/g, '').slice(0, FULL_PHONE_MAX)
    );
    if (!fullPhoneDigitsValid(recipientNorm)) {
      setSubmitError(resolveFullPhoneHintMessage(getFullPhoneFieldHint(recipientNorm), tCo, tCart));
      setSubmitting(false);
      return;
    }
    if (!fullPhoneDigitsValid(yourNorm)) {
      setSubmitError(resolveFullPhoneHintMessage(getFullPhoneFieldHint(yourNorm), tCo, tCart));
      setSubmitting(false);
      return;
    }
    const fd = new FormData(form);
    fd.set('recipientPhone', recipientNorm);
    fd.set('yourPhone', yourNorm);
    fd.set('submission_token', crypto.randomUUID());
    fd.set('lang', lang);
    try {
      const res = await fetch('/api/custom-order', { method: 'POST', body: fd });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        orderId?: string;
      };
      if (!res.ok) {
        setSubmitError(typeof data.error === 'string' ? data.error : t.submitError);
        return;
      }
      if (data.orderId) {
        setSuccessOrderId(data.orderId);
        form.reset();
        setRecipientPhoneDigits('');
        setYourPhoneDigits('');
        setPickedFileName(null);
        setFileError(null);
        setSelectedDate(null);
        setDatePopoverOpen(false);
      } else {
        setSubmitError(t.submitError);
      }
    } catch {
      setSubmitError(t.submitError);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="co-page">
      <div className="container">
        <h1 className="co-title">{t.title}</h1>
        <p className="co-intro">{t.intro}</p>

        {successOrderId && (
          <div className="co-success" role="status">
            <p className="co-success-text">{t.submitSuccess}</p>
            <Link href={`/order/${encodeURIComponent(successOrderId)}`} className="co-success-link">
              {t.submitSuccessViewOrder} →
            </Link>
          </div>
        )}
        {submitError && (
          <p className="co-error-banner" role="alert">
            {submitError}
          </p>
        )}

        <form className="co-form" onSubmit={onSubmit} aria-busy={submitting}>
          <div className="co-row co-row-stack">
            <div className="co-label-cell">
              <span className="co-label">{t.deliveryCity}</span>
            </div>
            <div className="co-field-cell">
              <p className="co-static">{t.currentCity}</p>
              <p className="co-inline-hint">
                {t.chooseOtherCity}{' '}
                <Link href={contactHref} className="co-link">
                  {t.chooseOtherCityLink}
                </Link>
              </p>
            </div>
          </div>

          <div className="co-row">
            <label className="co-label-cell" htmlFor="deliveryAddress">
              <span className="co-label">
                {t.deliveryAddress}
                <span className="co-req" aria-hidden>
                  {' '}
                  *
                </span>
              </span>
            </label>
            <div className="co-field-cell">
              <input
                id="deliveryAddress"
                name="deliveryAddress"
                type="text"
                required
                autoComplete="street-address"
                className="co-input"
              />
            </div>
          </div>

          <div className="co-row">
            <label className="co-label-cell" htmlFor="recipient">
              <span className="co-label">
                {t.recipient}
                <span className="co-req" aria-hidden>
                  {' '}
                  *
                </span>
              </span>
            </label>
            <div className="co-field-cell">
              <input id="recipient" name="recipient" type="text" required className="co-input" />
            </div>
          </div>

          <div className="co-row">
            <label className="co-label-cell" htmlFor="recipientPhone">
              <span className="co-label">
                {t.recipientPhone}
                <span className="co-req" aria-hidden>
                  {' '}
                  *
                </span>
              </span>
            </label>
            <div className="co-field-cell co-phone-field-group">
              <input
                id="recipientPhone"
                name="recipientPhone"
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                required
                className="co-input"
                value={recipientPhoneDigits}
                onChange={(e) =>
                  setRecipientPhoneDigits(
                    e.target.value.replace(/\D/g, '').slice(0, FULL_PHONE_MAX)
                  )
                }
                onBlur={() => setRecipientPhoneDigits((d) => normalizeFullPhoneOnBlur(d))}
                aria-describedby="recipientPhone-hint recipientPhone-hint-expanded"
                aria-invalid={recipientPhoneHint.tone === 'warn'}
              />
              <div className="co-phone-hint-stack">
                <p
                  id="recipientPhone-hint"
                  className={`co-phone-hint co-phone-hint--${recipientPhoneHint.tone}`}
                  role={recipientPhoneHint.tone === 'warn' ? 'alert' : 'status'}
                >
                  {resolveFullPhoneHintMessage(recipientPhoneHint, tCo, tCart)}
                </p>
                <div className="co-phone-hint-expanded" id="recipientPhone-hint-expanded">
                  <p className="co-phone-hint-expanded-text">{tCo.phoneHintExpandedGuideFull}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="co-row">
            <div className="co-label-cell">
              <span className="co-label" id="delivery-date-label">
                {t.deliveryDate}
              </span>
            </div>
            <div className="co-field-cell">
              <input type="hidden" name="deliveryDay" value={selectedDate?.day ?? ''} />
              <input type="hidden" name="deliveryMonth" value={selectedDate?.month ?? ''} />
              <input type="hidden" name="deliveryYear" value={selectedDate?.year ?? ''} />
              <div className="co-date-field" ref={datePickerRef}>
                <button
                  type="button"
                  className={`co-date-trigger ${!selectedDate ? 'co-date-trigger--placeholder' : ''}`}
                  onClick={toggleDatePicker}
                  aria-expanded={datePopoverOpen}
                  aria-haspopup="dialog"
                  aria-labelledby="delivery-date-label"
                >
                  <span className="co-date-trigger-text">{formatSelectedDateDisplay()}</span>
                  <span className="material-symbols-outlined co-date-trigger-icon" aria-hidden>
                    calendar_month
                  </span>
                </button>
                {datePopoverOpen && (
                  <div className="co-date-popover" role="dialog" aria-label={t.deliveryDate}>
                    <div className="co-date-popover-toolbar">
                      <select
                        className="co-date-popover-select co-date-popover-select--month"
                        value={calendarMonth}
                        onChange={(e) => setCalendarMonth(Number(e.target.value))}
                        aria-label={t.month}
                      >
                        {monthOptions.map((m, i) => (
                          <option key={m.value} value={i}>
                            {m.label}
                          </option>
                        ))}
                      </select>
                      <select
                        className="co-date-popover-select co-date-popover-select--year"
                        value={calendarYear}
                        onChange={(e) => setCalendarYear(Number(e.target.value))}
                        aria-label={t.year}
                      >
                        {years.map((y) => (
                          <option key={y} value={y}>
                            {y}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="co-date-weekdays" aria-hidden>
                      {weekDayLabels.map((label, wi) => (
                        <span key={`wd-${wi}`} className="co-date-weekday">
                          {label}
                        </span>
                      ))}
                    </div>
                    <div className="co-date-grid">
                      {calendarWeeks.map((row, ri) => (
                        <div key={ri} className="co-date-grid-row">
                          {row.map((cell, ci) => {
                            if (cell == null) {
                              return <span key={`e-${ri}-${ci}`} className="co-date-cell co-date-cell--empty" />;
                            }
                            const isSelected =
                              selectedDate != null &&
                              selectedDate.day === cell &&
                              selectedDate.month === calendarMonth + 1 &&
                              selectedDate.year === calendarYear;
                            const today = new Date();
                            const isToday =
                              cell === today.getDate() &&
                              calendarMonth === today.getMonth() &&
                              calendarYear === today.getFullYear();
                            return (
                              <button
                                key={cell}
                                type="button"
                                className={`co-date-cell ${isSelected ? 'co-date-cell--selected' : ''} ${isToday ? 'co-date-cell--today' : ''}`}
                                onClick={() => {
                                  setSelectedDate({
                                    day: cell,
                                    month: calendarMonth + 1,
                                    year: calendarYear,
                                  });
                                  setDatePopoverOpen(false);
                                }}
                              >
                                {cell}
                              </button>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                    <div className="co-date-popover-footer">
                      <button
                        type="button"
                        className="co-date-clear"
                        onClick={() => {
                          setSelectedDate(null);
                          setDatePopoverOpen(false);
                        }}
                      >
                        {t.dateClear}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="co-row">
            <div className="co-label-cell">
              <span className="co-label">{t.time}</span>
            </div>
            <div className="co-field-cell">
              <select name="timePreference" className="co-select co-select-full" required defaultValue="">
                <option value="" disabled>
                  {t.selectTime}
                </option>
                <option value={t.timeAsap}>{t.timeAsap}</option>
                <option value={t.timeMorning}>{t.timeMorning}</option>
                <option value={t.timeAfternoon}>{t.timeAfternoon}</option>
                <option value={t.timeEvening}>{t.timeEvening}</option>
              </select>
            </div>
          </div>

          <div className="co-row">
            <label className="co-label-cell" htmlFor="timeComments">
              <span className="co-label">{t.timeComments}</span>
            </label>
            <div className="co-field-cell">
              <input id="timeComments" name="timeComments" type="text" className="co-input" />
            </div>
          </div>

          <div className="co-row">
            <label className="co-label-cell" htmlFor="giftDescription">
              <span className="co-label">
                {t.giftDescription}
                <span className="co-req" aria-hidden>
                  {' '}
                  *
                </span>
              </span>
              <span className="co-hint">{t.giftDescriptionHint}</span>
            </label>
            <div className="co-field-cell">
              <input
                id="giftDescription"
                name="giftDescription"
                type="text"
                required
                className="co-input"
              />
            </div>
          </div>

          <div className="co-row">
            <label className="co-label-cell" htmlFor="referenceImage">
              <span className="co-label">{t.attachImage}</span>
              <span className="co-hint">{t.attachImageHint}</span>
            </label>
            <div className="co-field-cell">
              <div className="co-file-picker">
                <input
                  id="referenceImage"
                  name="referenceImage"
                  type="file"
                  accept="image/*"
                  className="co-file-input-native"
                  onChange={onFileChange}
                />
                <label htmlFor="referenceImage" className="co-file-button">
                  {t.chooseFile}
                </label>
                <span className="co-file-name" title={pickedFileName ?? undefined}>
                  {pickedFileName ?? t.noFileChosen}
                </span>
              </div>
              {fileError && <p className="co-error">{fileError}</p>}
            </div>
          </div>

          <div className="co-row">
            <div className="co-label-cell">
              <span className="co-label">{t.occasion}</span>
            </div>
            <div className="co-field-cell">
              <select name="occasion" className="co-select co-select-full" required defaultValue="">
                <option value="" disabled>
                  {t.selectOccasion}
                </option>
                {occasionOptions.map((o) => (
                  <option key={o.value} value={o.label}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="co-row">
            <label className="co-label-cell" htmlFor="greetingCard">
              <span className="co-label">{t.greetingCard}</span>
              <span className="co-hint">{t.greetingCardHint}</span>
            </label>
            <div className="co-field-cell">
              <textarea id="greetingCard" name="greetingCard" rows={3} className="co-textarea" />
            </div>
          </div>

          <div className="co-row">
            <label className="co-label-cell" htmlFor="yourName">
              <span className="co-label">{t.yourName}</span>
            </label>
            <div className="co-field-cell">
              <input id="yourName" name="yourName" type="text" autoComplete="name" className="co-input" />
            </div>
          </div>

          <div className="co-row">
            <label className="co-label-cell" htmlFor="email">
              <span className="co-label">
                {t.email}
                <span className="co-req" aria-hidden>
                  {' '}
                  *
                </span>
              </span>
            </label>
            <div className="co-field-cell">
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                className="co-input"
              />
            </div>
          </div>

          <div className="co-row">
            <label className="co-label-cell" htmlFor="yourPhone">
              <span className="co-label">
                {t.yourPhone}
                <span className="co-req" aria-hidden>
                  {' '}
                  *
                </span>
              </span>
            </label>
            <div className="co-field-cell co-phone-field-group">
              <input
                id="yourPhone"
                name="yourPhone"
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                required
                className="co-input"
                value={yourPhoneDigits}
                onChange={(e) =>
                  setYourPhoneDigits(e.target.value.replace(/\D/g, '').slice(0, FULL_PHONE_MAX))
                }
                onBlur={() => setYourPhoneDigits((d) => normalizeFullPhoneOnBlur(d))}
                aria-describedby="yourPhone-hint yourPhone-hint-expanded"
                aria-invalid={yourPhoneHint.tone === 'warn'}
              />
              <div className="co-phone-hint-stack">
                <p
                  id="yourPhone-hint"
                  className={`co-phone-hint co-phone-hint--${yourPhoneHint.tone}`}
                  role={yourPhoneHint.tone === 'warn' ? 'alert' : 'status'}
                >
                  {resolveFullPhoneHintMessage(yourPhoneHint, tCo, tCart)}
                </p>
                <div className="co-phone-hint-expanded" id="yourPhone-hint-expanded">
                  <p className="co-phone-hint-expanded-text">{tCo.phoneHintExpandedGuideFull}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="co-row">
            <label className="co-label-cell" htmlFor="estimatedCost">
              <span className="co-label">{t.estimatedCost}</span>
              <span className="co-hint">{t.estimatedCostHint}</span>
            </label>
            <div className="co-field-cell">
              <input
                id="estimatedCost"
                name="estimatedCost"
                type="text"
                inputMode="numeric"
                className="co-input co-input-short"
                placeholder={lang === 'th' ? 'เช่น 1500' : 'e.g. 1500'}
              />
            </div>
          </div>

          <div className="co-row">
            <label className="co-label-cell" htmlFor="comments">
              <span className="co-label">{t.comments}</span>
            </label>
            <div className="co-field-cell">
              <textarea
                id="comments"
                name="comments"
                rows={4}
                className="co-textarea"
                placeholder={t.commentsPlaceholder}
              />
            </div>
          </div>

          <p className="co-submit-note">{t.afterSubmitNote}</p>

          <button type="submit" className="co-submit" disabled={submitting}>
            <span>{submitting ? t.submitSending : t.submit}</span>
            <span className="material-symbols-outlined co-submit-icon" aria-hidden>
              arrow_forward
            </span>
          </button>
        </form>
      </div>

      <style jsx>{`
        .co-page {
          padding: 24px 0 56px;
          font-family: var(--font-sans);
        }
        .co-title {
          font-family: var(--font-serif);
          font-size: clamp(1.5rem, 4vw, 1.85rem);
          font-weight: 600;
          color: var(--primary);
          text-align: center;
          margin: 0 0 12px;
        }
        .co-intro {
          text-align: center;
          max-width: 36rem;
          margin: 0 auto 32px;
          font-size: 1rem;
          line-height: 1.6;
          color: var(--text-muted);
        }
        .co-form {
          max-width: 40rem;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .co-row {
          display: grid;
          grid-template-columns: minmax(0, 140px) 1fr;
          gap: 12px 20px;
          align-items: start;
        }
        @media (max-width: 639px) {
          .co-row {
            grid-template-columns: 1fr;
            gap: 6px;
          }
          .co-row-stack .co-label-cell {
            margin-bottom: 0;
          }
        }
        .co-label-cell {
          padding-top: 10px;
        }
        @media (max-width: 639px) {
          .co-label-cell {
            padding-top: 0;
          }
        }
        .co-label {
          display: block;
          font-size: 0.9375rem;
          font-weight: 600;
          color: var(--text);
        }
        .co-req {
          color: #b45309;
          font-weight: 700;
        }
        .co-hint {
          display: block;
          font-size: 0.8125rem;
          font-weight: 500;
          color: var(--text-muted);
          margin-top: 4px;
          line-height: 1.4;
        }
        .co-static {
          margin: 0;
          font-size: 1rem;
          font-weight: 600;
          color: var(--text);
        }
        .co-inline-hint {
          margin: 6px 0 0;
          font-size: 0.875rem;
          color: var(--text-muted);
        }
        .co-link {
          color: var(--accent);
          font-weight: 600;
          text-decoration: underline;
        }
        .co-link:hover {
          color: #967a4d;
        }
        .co-input,
        .co-select,
        .co-textarea {
          width: 100%;
          max-width: 100%;
          box-sizing: border-box;
          padding: 12px 16px;
          font-size: 1rem;
          font-family: inherit;
          color: var(--text);
          background: var(--pastel-cream);
          border: 1px solid var(--border);
          border-radius: 20px;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .co-input:focus,
        .co-select:focus,
        .co-textarea:focus {
          outline: none;
          border-color: var(--accent);
          box-shadow: 0 0 0 3px var(--accent-soft);
        }
        .co-input-short {
          max-width: 12rem;
        }
        .co-phone-field-group {
          position: relative;
        }
        .co-phone-hint-stack {
          margin-top: 6px;
        }
        .co-phone-hint {
          font-size: 0.8125rem;
          font-weight: 500;
          margin: 0;
          line-height: 1.4;
        }
        .co-phone-hint--neutral {
          color: var(--text-muted);
          font-weight: 400;
        }
        .co-phone-hint--tip {
          color: #b45309;
        }
        .co-phone-hint--warn {
          color: #b91c1c;
        }
        .co-phone-hint--success {
          color: #15803d;
        }
        .co-phone-hint-expanded {
          max-height: 0;
          opacity: 0;
          overflow: hidden;
          transition: max-height 0.28s ease, opacity 0.22s ease, margin 0.22s ease;
        }
        .co-phone-field-group:focus-within .co-phone-hint-expanded {
          max-height: 140px;
          opacity: 1;
          margin-top: 8px;
        }
        .co-phone-hint-expanded-text {
          font-size: 0.8125rem;
          line-height: 1.45;
          color: var(--text-muted);
          margin: 0;
          padding: 10px 14px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 16px;
        }
        .co-textarea {
          min-height: 88px;
          resize: vertical;
        }
        .co-select {
          cursor: pointer;
          appearance: auto;
          padding-right: 36px;
          background-position: right 10px center;
        }
        .co-select-full {
          width: 100%;
        }
        .co-date-field {
          position: relative;
          width: 100%;
          max-width: 100%;
        }
        .co-date-trigger {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          width: 100%;
          box-sizing: border-box;
          padding: 12px 16px;
          font-size: 1rem;
          font-family: inherit;
          text-align: left;
          color: var(--text);
          background: var(--pastel-cream);
          border: 1px solid var(--border);
          border-radius: 20px;
          cursor: pointer;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .co-date-trigger:hover {
          border-color: #d4cfc7;
        }
        .co-date-trigger:focus {
          outline: none;
          border-color: var(--accent);
          box-shadow: 0 0 0 3px var(--accent-soft);
        }
        .co-date-trigger--placeholder .co-date-trigger-text {
          color: var(--text-muted);
          font-weight: 500;
        }
        .co-date-trigger-text {
          flex: 1;
          min-width: 0;
        }
        .co-date-trigger-icon {
          font-size: 1.35rem;
          color: var(--primary);
          flex-shrink: 0;
        }
        .co-date-popover {
          position: absolute;
          z-index: 40;
          left: 0;
          right: 0;
          margin-top: 8px;
          padding: 14px 14px 10px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 16px;
          box-shadow: var(--shadow-hover);
        }
        @media (min-width: 400px) {
          .co-date-popover {
            right: auto;
            min-width: min(100%, 300px);
          }
        }
        .co-date-popover-toolbar {
          display: flex;
          gap: 10px;
          margin-bottom: 12px;
          align-items: center;
        }
        .co-date-popover-select {
          font-family: inherit;
          font-size: 0.9375rem;
          font-weight: 600;
          color: var(--primary);
          background: var(--pastel-cream);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 8px 10px;
          padding-right: 32px;
          background-position: right 8px center;
          cursor: pointer;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .co-date-popover-select:focus {
          outline: none;
          border-color: var(--accent);
          box-shadow: 0 0 0 2px var(--accent-soft);
        }
        .co-date-popover-select--month {
          flex: 1 1 auto;
          min-width: 0;
        }
        .co-date-popover-select--year {
          flex: 0 0 auto;
          min-width: 5.5rem;
        }
        .co-date-weekdays {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 4px;
          margin-bottom: 6px;
        }
        .co-date-weekday {
          font-size: 0.6875rem;
          font-weight: 600;
          color: var(--text-muted);
          text-align: center;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .co-date-grid {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .co-date-grid-row {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 4px;
        }
        .co-date-cell {
          aspect-ratio: 1;
          min-height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.875rem;
          font-weight: 600;
          font-family: inherit;
          color: var(--text);
          background: transparent;
          border: none;
          border-radius: 999px;
          cursor: pointer;
          transition: background 0.15s, color 0.15s;
        }
        .co-date-cell:hover:not(:disabled) {
          background: var(--accent-soft);
        }
        .co-date-cell--empty {
          pointer-events: none;
          visibility: hidden;
        }
        .co-date-cell--today:not(.co-date-cell--selected) {
          box-shadow: inset 0 0 0 1px var(--accent);
        }
        .co-date-cell--selected {
          background: linear-gradient(180deg, #d4b068 0%, var(--accent) 100%);
          color: var(--accent-cta-text);
        }
        .co-date-popover-footer {
          margin-top: 10px;
          padding-top: 8px;
          border-top: 1px solid var(--border);
          display: flex;
          justify-content: flex-end;
        }
        .co-date-clear {
          font-family: inherit;
          font-size: 0.8125rem;
          font-weight: 600;
          color: var(--text-muted);
          background: none;
          border: none;
          cursor: pointer;
          text-decoration: underline;
          padding: 4px 0;
        }
        .co-date-clear:hover {
          color: var(--primary);
        }
        .co-file-picker {
          position: relative;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 12px;
          padding: 10px 14px;
          min-height: 48px;
          box-sizing: border-box;
          background: var(--pastel-cream);
          border: 1px solid var(--border);
          border-radius: 20px;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .co-file-picker:focus-within {
          border-color: var(--accent);
          box-shadow: 0 0 0 3px var(--accent-soft);
        }
        .co-file-input-native {
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
        .co-file-button {
          flex-shrink: 0;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 10px 18px;
          font-size: 0.9375rem;
          font-weight: 600;
          font-family: inherit;
          color: var(--accent-cta-text);
          background: linear-gradient(180deg, #d4b068 0%, var(--accent) 100%);
          border: none;
          border-radius: 20px;
          cursor: pointer;
          box-shadow: 0 1px 4px rgba(45, 42, 38, 0.12);
          transition: filter 0.2s, transform 0.15s ease;
        }
        .co-file-button:hover {
          filter: brightness(1.06);
        }
        .co-file-button:active {
          transform: scale(0.98);
        }
        .co-file-name {
          flex: 1 1 120px;
          min-width: 0;
          font-size: 0.875rem;
          color: var(--text-muted);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .co-error {
          margin: 8px 0 0;
          font-size: 0.875rem;
          color: #b91c1c;
        }
        .co-submit-note {
          font-size: 0.875rem;
          line-height: 1.5;
          color: var(--text-muted);
          margin: 8px 0 0;
        }
        .co-submit {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          width: 100%;
          margin-top: 8px;
          padding: 16px 24px;
          font-size: 1rem;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          font-family: inherit;
          color: var(--accent-cta-text);
          background: linear-gradient(180deg, #d4b068 0%, var(--accent) 100%);
          border: none;
          border-radius: 20px;
          cursor: pointer;
          box-shadow: var(--shadow);
          transition: transform 0.15s ease, box-shadow 0.2s, filter 0.2s;
        }
        .co-submit:hover {
          filter: brightness(1.05);
          box-shadow: var(--shadow-hover);
        }
        .co-submit:active {
          transform: scale(0.99);
        }
        .co-submit:disabled {
          opacity: 0.75;
          cursor: not-allowed;
          transform: none;
        }
        .co-submit-icon {
          font-size: 1.25rem;
        }
      `}</style>
    </div>
  );
}
