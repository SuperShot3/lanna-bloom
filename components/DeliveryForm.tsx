'use client';

import { useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { translations } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';
import type { DeliveryLocationValue } from '@/components/DeliveryLocationPicker';
import { DISTRICTS, detectDistrictFromAddress, type DistrictKey } from '@/lib/deliveryFees';

const DeliveryLocationPicker = dynamic(
  () => import('@/components/DeliveryLocationPicker').then((m) => m.DeliveryLocationPicker),
  { ssr: false }
);

/** 4 delivery windows from 08:00 to 20:00. */
export const DELIVERY_TIME_SLOTS = [
  '08:00–12:00',  // Morning
  '12:00–15:00',  // Midday
  '15:00–18:00',  // Afternoon
  '18:00–20:00',  // Evening
] as const;

export interface DeliveryFormValues {
  addressLine: string;
  date: string;
  timeSlot: string;
  /** Delivery pin (map picker). Required on cart/checkout. */
  deliveryLat: number | null;
  deliveryLng: number | null;
  deliveryGoogleMapsUrl: string | null;
  /** District key. Required for fee calculation. */
  deliveryDistrict: DistrictKey | '';
  /** Central Chiang Mai (Old City / Nimman / etc). Only applies when district is MUEANG. */
  isMueangCentral: boolean;
}

export function DeliveryForm({
  lang,
  value,
  onChange,
  step3Heading,
  step3Content,
  title,
  showLocationPicker,
}: {
  lang: Locale;
  value: DeliveryFormValues;
  onChange: (v: DeliveryFormValues) => void;
  /** When provided (e.g. on cart page), Step 3 shows this heading and content instead of "ADD TO CART". */
  step3Heading?: string;
  step3Content?: React.ReactNode;
  /** When provided (e.g. on cart page), use this as the main form heading instead of buyNow.title. */
  title?: string;
  /** When true, show the "drop a pin" map picker after the address field (e.g. on cart/checkout). */
  showLocationPicker?: boolean;
}) {
  const t = translations[lang].buyNow;
  const districtManuallyChangedRef = useRef(false);

  useEffect(() => {
    if (districtManuallyChangedRef.current) return;
    const detected = detectDistrictFromAddress(value.addressLine);
    if (detected && value.deliveryDistrict !== detected) {
      onChange({ ...value, deliveryDistrict: detected });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only run on address change; value/onChange from closure
  }, [value.addressLine]);

  const handleDistrictChange = (key: DistrictKey | '') => {
    districtManuallyChangedRef.current = true;
    const isMueangCentral = key !== 'MUEANG' ? false : value.isMueangCentral;
    onChange({ ...value, deliveryDistrict: key, isMueangCentral });
  };

  const handleCentralToggle = (checked: boolean) => {
    onChange({ ...value, isMueangCentral: checked });
  };

  const showCentralToggle = value.deliveryDistrict === 'MUEANG';

  return (
    <div className="buy-now-form">
      <h2 className="buy-now-title">{title ?? t.title}</h2>

      {/* Step 1: District + Address + map pin */}
      <div className="buy-now-step">
        <span className="buy-now-num" aria-hidden>1</span>
        <div className="buy-now-step-content">
          <h3 className="buy-now-step-heading">{t.step1}</h3>
          {showLocationPicker && (t as { step1DeliveryIntro?: string }).step1DeliveryIntro && (
            <p className="buy-now-hint buy-now-step-intro">{(t as { step1DeliveryIntro: string }).step1DeliveryIntro}</p>
          )}
          {!showLocationPicker && <p className="buy-now-hint">{t.trySearchByPostalCode}</p>}
          <div className="buy-now-fields">
            <div className="buy-now-field">
              <label className="buy-now-label" htmlFor="buy-now-district">
                {((t as { districtLabelForFee?: string }).districtLabelForFee ?? t.districtLabel)} <span className="buy-now-required" aria-hidden>*</span>
              </label>
              <select
                id="buy-now-district"
                value={value.deliveryDistrict}
                onChange={(e) => handleDistrictChange((e.target.value || '') as DistrictKey | '')}
                className="buy-now-select buy-now-select-full"
                aria-required
                aria-label={t.districtLabel}
              >
                <option value="">{t.selectDistrict}</option>
                {DISTRICTS.map((d) => (
                  <option key={d.key} value={d.key}>
                    {lang === 'th' ? d.labelTh : d.labelEn}
                  </option>
                ))}
              </select>
            </div>
            <div className="buy-now-field">
              <label className="buy-now-label" htmlFor="buy-now-address">
                {t.addressLabel} <span className="buy-now-required" aria-hidden>*</span>
              </label>
              {showLocationPicker && (
                <p id="buy-now-address-tip-id" className="buy-now-address-tip" aria-live="polite">
                  {t.addressFieldHintWithMap}
                </p>
              )}
              <textarea
                id="buy-now-address"
                value={value.addressLine}
                onChange={(e) => onChange({ ...value, addressLine: e.target.value })}
                placeholder={t.addressPlaceholder}
                minLength={10}
                maxLength={300}
                rows={2}
                className="buy-now-input buy-now-textarea"
                aria-label={t.addressLabel}
                aria-describedby={showLocationPicker ? 'buy-now-address-tip-id buy-now-address-hint' : 'buy-now-address-hint'}
              />
              <span id="buy-now-address-hint" className="buy-now-address-hint">
                {value.addressLine.length}/300 {value.addressLine.length > 0 && value.addressLine.length < 10 && (
                  <span className="buy-now-address-error"> — {t.addressTooShort}</span>
                )}
              </span>
            </div>
            {showCentralToggle && (
              <div className="buy-now-field buy-now-central-toggle-wrap">
                <label className="buy-now-checkbox-label">
                  <input
                    type="checkbox"
                    checked={value.isMueangCentral}
                    onChange={(e) => handleCentralToggle(e.target.checked)}
                    className="buy-now-checkbox"
                    aria-describedby="buy-now-central-helper"
                  />
                  <span className="buy-now-checkbox-text">{t.centralMueangLabel}</span>
                </label>
                <p id="buy-now-central-helper" className="buy-now-central-helper">
                  {t.centralMueangHelper}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {showLocationPicker && (
        <DeliveryLocationPicker
            value={
              value.deliveryLat != null && value.deliveryLng != null && value.deliveryGoogleMapsUrl != null
                ? { lat: value.deliveryLat, lng: value.deliveryLng, googleMapsUrl: value.deliveryGoogleMapsUrl }
                : null
            }
            onChange={(v: DeliveryLocationValue | null) =>
              onChange({
                ...value,
                deliveryLat: v?.lat ?? null,
                deliveryLng: v?.lng ?? null,
                deliveryGoogleMapsUrl: v?.googleMapsUrl ?? null,
              })
            }
            dropPinPrompt={t.dropPinPrompt}
            selectedLocationLabel={t.selectedLocation}
            openInGoogleMapsLabel={t.openInGoogleMaps}
          />
      )}

      {/* Step 2: Delivery date + preferred time slot */}
      <div className="buy-now-step">
        <span className="buy-now-num" aria-hidden>2</span>
        <div className="buy-now-step-content">
          <h3 className="buy-now-step-heading">{t.step3}</h3>
          <p className="buy-now-hint">{t.selectDeliveryDateAndTime}</p>
          <div className="buy-now-fields">
            <div className="buy-now-field">
              <label className="buy-now-label" htmlFor="buy-now-date">
                {t.specifyDeliveryDate}
              </label>
              <input
                id="buy-now-date"
                type="date"
                value={value.date}
                onChange={(e) => onChange({ ...value, date: e.target.value })}
                min={new Date().toISOString().slice(0, 10)}
                className="buy-now-input"
                aria-label={t.specifyDeliveryDate}
              />
            </div>
            <div className="buy-now-field">
              <label className="buy-now-label" htmlFor="buy-now-time-slot">
                {t.preferredTime}
              </label>
              <select
                id="buy-now-time-slot"
                value={value.timeSlot}
                onChange={(e) => onChange({ ...value, timeSlot: e.target.value })}
                className="buy-now-select"
                aria-label={t.preferredTime}
              >
                <option value="">{t.selectTimeSlot}</option>
                {DELIVERY_TIME_SLOTS.map((slot) => (
                  <option key={slot} value={slot}>
                    {slot}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Step 3: Custom content (e.g. Send order via) or default "ADD TO CART" */}
      <div className="buy-now-step buy-now-step-4">
        <span className="buy-now-num" aria-hidden>3</span>
        <div className="buy-now-step-content">
          <h3 className="buy-now-step-heading">{step3Heading ?? t.step4}</h3>
          {step3Content}
        </div>
      </div>

      <style jsx>{`
        .buy-now-form {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 20px;
          margin-top: 24px;
          box-shadow: var(--shadow);
        }
        .buy-now-title {
          font-size: 1.1rem;
          font-weight: 700;
          color: var(--text);
          margin: 0 0 20px;
          text-align: center;
          text-transform: uppercase;
          letter-spacing: 0.02em;
        }
        @media (max-width: 480px) {
          .buy-now-form {
            padding: 16px;
            margin-top: 20px;
          }
          .buy-now-title {
            font-size: 1rem;
            margin-bottom: 16px;
          }
          .buy-now-step {
            margin-bottom: 16px;
          }
        }
        @media (max-width: 360px) {
          .buy-now-form {
            padding: 12px;
          }
          .buy-now-title {
            font-size: 0.95rem;
            margin-bottom: 12px;
          }
          .buy-now-step-heading {
            font-size: 0.85rem;
          }
        }
        @media (max-width: 350px) {
          .buy-now-form {
            padding: 10px;
          }
          .buy-now-title {
            font-size: 0.9rem;
            margin-bottom: 10px;
          }
          .buy-now-step {
            margin-bottom: 14px;
            gap: 8px;
          }
          .buy-now-step-heading {
            font-size: 0.8rem;
          }
          .buy-now-num {
            width: 24px;
            height: 24px;
            font-size: 0.8rem;
          }
          .buy-now-input,
          .buy-now-select {
            padding: 8px 10px;
            font-size: 0.9rem;
          }
          .buy-now-radio-pill {
            padding: 6px 10px;
            font-size: 0.8rem;
          }
        }
        .buy-now-step {
          display: flex;
          gap: 12px;
          margin-bottom: 20px;
        }
        .buy-now-step:last-child {
          margin-bottom: 0;
        }
        .buy-now-num {
          flex-shrink: 0;
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--accent);
          color: #fff;
          font-size: 0.9rem;
          font-weight: 700;
          border-radius: 50%;
        }
        .buy-now-step-content {
          flex: 1;
        }
        .buy-now-step-heading {
          font-size: 0.9rem;
          font-weight: 600;
          color: var(--text);
          margin: 0 0 6px;
        }
        .buy-now-hint {
          font-size: 0.8rem;
          color: var(--text-muted);
          margin: 0 0 10px;
        }
        .buy-now-fields {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .buy-now-field {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .buy-now-label {
          font-size: 0.85rem;
          font-weight: 500;
          color: var(--text-muted);
        }
        .buy-now-input,
        .buy-now-select {
          padding: 10px 12px;
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          font-size: 0.95rem;
          font-family: inherit;
          background: var(--surface);
          color: var(--text);
        }
        .buy-now-input:focus,
        .buy-now-select:focus {
          outline: none;
          border-color: var(--accent);
        }
        .buy-now-input-readonly {
          background: var(--pastel-cream);
          cursor: default;
        }
        .buy-now-select:disabled,
        .buy-now-input:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .buy-now-step-4 .buy-now-step-content {
          margin-bottom: 0;
        }
        .buy-now-radio-pills {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .buy-now-radio-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 12px;
          border: 1px solid var(--border);
          border-radius: 999px;
          font-size: 0.85rem;
          color: var(--text);
          cursor: pointer;
          transition: border-color 0.15s, background 0.15s;
        }
        .buy-now-radio-pill:hover {
          border-color: var(--accent);
        }
        .buy-now-radio-input {
          margin: 0;
          accent-color: var(--accent);
        }
        .buy-now-radio-pill:has(.buy-now-radio-input:checked) {
          border-color: var(--accent);
          background: var(--accent-soft, #e8dfd0);
        }
        .buy-now-delivery-info {
          margin-top: 12px;
          margin-bottom: 20px;
          margin-left: 40px;
          padding: 12px 14px;
          background: var(--pastel-cream, #fdf8f3);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
        }
        .buy-now-delivery-info-title {
          font-size: 12px;
          font-weight: 600;
          color: var(--text);
          margin: 0 0 8px;
        }
        .buy-now-delivery-info-line {
          font-size: 11px;
          line-height: 1.4;
          color: var(--text-muted);
          margin: 0 0 4px;
        }
        .buy-now-delivery-info-line:last-child {
          margin-bottom: 0;
        }
        .buy-now-delivery-info-note {
          font-size: 11px;
          margin-top: 6px;
        }
        .buy-now-textarea {
          resize: vertical;
          min-height: 60px;
        }
        .buy-now-address-tip {
          font-size: 0.85rem;
          color: var(--text-muted);
          margin: 0 0 6px;
          line-height: 1.4;
        }
        .buy-now-address-hint {
          font-size: 0.8rem;
          color: var(--text-muted);
        }
        .buy-now-address-error {
          color: var(--accent);
        }
        .buy-now-delivery-instructions {
          margin-top: 16px;
          margin-bottom: 12px;
          padding: 14px 16px;
          background: var(--pastel-cream, #fdf8f3);
          border: 1px solid var(--border);
          border-left: 4px solid var(--accent);
          border-radius: var(--radius-sm);
        }
        .buy-now-delivery-instructions-title {
          font-size: 0.95rem;
          font-weight: 700;
          color: var(--text);
          margin: 0 0 10px;
        }
        .buy-now-delivery-instructions-list {
          margin: 0;
          padding-left: 20px;
          font-size: 0.9rem;
          line-height: 1.5;
          color: var(--text);
        }
        .buy-now-delivery-instructions-list li {
          margin-bottom: 6px;
        }
        .buy-now-delivery-instructions-list li:last-child {
          margin-bottom: 0;
        }
        .buy-now-required {
          color: #b91c1c;
        }
        .buy-now-select-full {
          width: 100%;
        }
        .buy-now-central-toggle-wrap {
          margin-top: 8px;
          padding: 12px 14px;
          background: var(--pastel-cream, #fdf8f3);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
        }
        .buy-now-checkbox-label {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          font-size: 0.9rem;
          line-height: 1.4;
          color: var(--text);
          cursor: pointer;
        }
        .buy-now-checkbox {
          flex-shrink: 0;
          margin-top: 2px;
          accent-color: var(--accent);
        }
        .buy-now-checkbox-text {
          flex: 1;
          min-width: 0;
        }
        .buy-now-central-helper {
          font-size: 0.8rem;
          color: var(--text-muted);
          margin: 8px 0 0 28px;
        }
      `}</style>
    </div>
  );
}
