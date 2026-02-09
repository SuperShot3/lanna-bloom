'use client';

import {
  CHIANG_MAI_DISTRICTS,
  CITY_EN,
  CITY_TH,
  getDeliveryTier,
  getTotalTimeRangeMinutes,
} from '@/lib/delivery-areas';
import type { DeliveryType, District } from '@/lib/delivery-areas';
import { translations } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';

export interface DeliveryFormValues {
  district: District | null;
  addressLine: string;
  date: string;
  deliveryType: DeliveryType;
}

export function DeliveryForm({
  lang,
  value,
  onChange,
  step3Heading,
  step3Content,
  title,
}: {
  lang: Locale;
  value: DeliveryFormValues;
  onChange: (v: DeliveryFormValues) => void;
  /** When provided (e.g. on cart page), Step 3 shows this heading and content instead of "ADD TO CART". */
  step3Heading?: string;
  step3Content?: React.ReactNode;
  /** When provided (e.g. on cart page), use this as the main form heading instead of buyNow.title. */
  title?: string;
}) {
  const t = translations[lang].buyNow;
  const city = lang === 'th' ? CITY_TH : CITY_EN;
  const districtLabel = (d: District) => (lang === 'th' ? d.nameTh : d.nameEn);
  const hasArea = !!value.district;
  const timeRange =
    value.district &&
    getTotalTimeRangeMinutes(getDeliveryTier(value.district), value.deliveryType);

  return (
    <div className="buy-now-form">
      <h2 className="buy-now-title">{title ?? t.title}</h2>

      {/* Step 1: Select delivery area */}
      <div className="buy-now-step">
        <span className="buy-now-num" aria-hidden>1</span>
        <div className="buy-now-step-content">
          <h3 className="buy-now-step-heading">{t.step1}</h3>
          <p className="buy-now-hint">{t.trySearchByPostalCode}</p>
          <div className="buy-now-fields">
            <div className="buy-now-field">
              <label className="buy-now-label" htmlFor="buy-now-city">
                {t.city}
              </label>
              <input
                id="buy-now-city"
                type="text"
                value={city}
                readOnly
                className="buy-now-input buy-now-input-readonly"
                aria-label={t.city}
              />
            </div>
            <div className="buy-now-field">
              <label className="buy-now-label" htmlFor="buy-now-district">
                {t.selectDistrict}
              </label>
              <select
                id="buy-now-district"
                value={value.district?.id ?? ''}
                onChange={(e) => {
                  const id = e.target.value;
                  const district = CHIANG_MAI_DISTRICTS.find((d) => d.id === id) ?? null;
                  onChange({ ...value, district });
                }}
                className="buy-now-select"
                aria-label={t.selectDistrict}
              >
                <option value="">{t.selectDistrict}</option>
                {CHIANG_MAI_DISTRICTS.map((d) => (
                  <option key={d.id} value={d.id}>
                    {districtLabel(d)}
                  </option>
                ))}
              </select>
            </div>
            <div className="buy-now-field">
              <label className="buy-now-label" htmlFor="buy-now-address">
                {t.addressLabel}
              </label>
              <textarea
                id="buy-now-address"
                value={value.addressLine}
                onChange={(e) => onChange({ ...value, addressLine: e.target.value })}
                placeholder={t.addressPlaceholder}
                minLength={10}
                maxLength={300}
                rows={2}
                disabled={!hasArea}
                className="buy-now-input buy-now-textarea"
                aria-label={t.addressLabel}
                aria-describedby="buy-now-address-hint"
              />
              <span id="buy-now-address-hint" className="buy-now-address-hint">
                {value.addressLine.length}/300 {value.addressLine.length > 0 && value.addressLine.length < 10 && (
                  <span className="buy-now-address-error"> — {t.addressTooShort}</span>
                )}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Step 2: Delivery date + delivery type */}
      <div className="buy-now-step">
        <span className="buy-now-num" aria-hidden>2</span>
        <div className="buy-now-step-content">
          <h3 className="buy-now-step-heading">{t.step3}</h3>
          <p className="buy-now-hint">{t.selectAreaFirstDate}</p>
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
                disabled={!hasArea}
                className="buy-now-input"
                aria-label={t.specifyDeliveryDate}
              />
            </div>
            <div className="buy-now-field">
              <span className="buy-now-label">{t.chooseDeliveryType}</span>
              <div className="buy-now-radio-pills" role="radiogroup" aria-label={t.chooseDeliveryType}>
                <label className="buy-now-radio-pill">
                  <input
                    type="radio"
                    name="deliveryType"
                    value="standard"
                    checked={value.deliveryType === 'standard'}
                    onChange={() => onChange({ ...value, deliveryType: 'standard' })}
                    className="buy-now-radio-input"
                  />
                  <span>{t.deliveryTypeStandard}</span>
                </label>
                <label className="buy-now-radio-pill">
                  <input
                    type="radio"
                    name="deliveryType"
                    value="priority"
                    checked={value.deliveryType === 'priority'}
                    onChange={() => onChange({ ...value, deliveryType: 'priority' })}
                    className="buy-now-radio-input"
                  />
                  <span>{t.deliveryTypePriority}</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delivery information (only when district selected) */}
      {value.district && timeRange && (
        <div className="buy-now-delivery-info">
          <h4 className="buy-now-delivery-info-title">{t.deliveryInfoTitle}</h4>
          <p className="buy-now-delivery-info-line">
            {t.preparationTimeLabel} {t.preparationTimeValue}
          </p>
          <p className="buy-now-delivery-info-line">{t.deliveryDependsOnLocation}</p>
          <p className="buy-now-delivery-info-line">
            {t.estimatedTotalTime} ~{timeRange.minTotal}–{timeRange.maxTotal} {t.minutes}
          </p>
          <p className="buy-now-delivery-info-line buy-now-delivery-info-note">
            {t.exactTimeInMessenger}
          </p>
          <p className="buy-now-delivery-info-line buy-now-delivery-info-note">
            {t.finalPriceDisclaimer}
          </p>
        </div>
      )}

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
        .buy-now-address-hint {
          font-size: 0.8rem;
          color: var(--text-muted);
        }
        .buy-now-address-error {
          color: var(--accent);
        }
      `}</style>
    </div>
  );
}
