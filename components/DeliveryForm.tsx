'use client';

import { CHIANG_MAI_DISTRICTS, CITY_EN, CITY_TH } from '@/lib/delivery-areas';
import type { District } from '@/lib/delivery-areas';
import { translations } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';

export interface DeliveryFormValues {
  district: District | null;
  date: string;
}

export function DeliveryForm({
  lang,
  value,
  onChange,
}: {
  lang: Locale;
  value: DeliveryFormValues;
  onChange: (v: DeliveryFormValues) => void;
}) {
  const t = translations[lang].buyNow;
  const city = lang === 'th' ? CITY_TH : CITY_EN;
  const districtLabel = (d: District) => (lang === 'th' ? d.nameTh : d.nameEn);
  const hasArea = !!value.district;

  return (
    <div className="buy-now-form">
      <h2 className="buy-now-title">{t.title}</h2>

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
          </div>
        </div>
      </div>

      {/* Step 2: Delivery date */}
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
          </div>
        </div>
      </div>

      {/* Step 3: Order buttons are below in ProductOrderBlock */}
      <div className="buy-now-step buy-now-step-4">
        <span className="buy-now-num" aria-hidden>3</span>
        <div className="buy-now-step-content">
          <h3 className="buy-now-step-heading">{t.step4}</h3>
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
      `}</style>
    </div>
  );
}
