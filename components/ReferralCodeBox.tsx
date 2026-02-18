'use client';

import { useState } from 'react';
import { storeReferral, clearReferral, validateReferralCode } from '@/lib/referral';
import type { Locale } from '@/lib/i18n';
import { translations } from '@/lib/i18n';

export interface ReferralCodeBoxProps {
  lang: Locale;
  subtotal: number;
  appliedCode: string | null;
  onApply: () => void;
  onRemove: () => void;
  /** If true, show "can't combine with other discounts" and block apply */
  hasOtherDiscount?: boolean;
}

export function ReferralCodeBox({
  lang,
  subtotal,
  appliedCode,
  onApply,
  onRemove,
  hasOtherDiscount = false,
}: ReferralCodeBoxProps) {
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const t = translations[lang].cart as Record<string, string>;

  const handleApply = () => {
    setError(null);
    if (hasOtherDiscount) {
      setError(t.referralCannotStack ?? "Referral code can't be combined with other discounts.");
      return;
    }
    const result = validateReferralCode(inputValue);
    if (!result.valid) {
      setError(result.error ?? t.referralInvalid ?? 'Invalid code.');
      return;
    }
    storeReferral(result.code);
    setInputValue('');
    setError(null);
    onApply();
  };

  const handleRemove = () => {
    clearReferral();
    setInputValue('');
    setError(null);
    onRemove();
  };

  if (appliedCode) {
    return (
      <div className="referral-code-box referral-code-box--applied">
        <span className="referral-code-box-applied">
          {(t.referralApplied ?? 'Applied: {code}').replace('{code}', appliedCode)}
        </span>
        <button
          type="button"
          className="referral-code-box-remove"
          onClick={handleRemove}
          aria-label={t.referralRemove ?? 'Remove'}
        >
          {t.referralRemove ?? 'Remove'}
        </button>
        <style jsx>{`
          .referral-code-box--applied {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: 8px;
            padding: 12px 0;
          }
          .referral-code-box-applied {
            font-size: 0.9rem;
            color: var(--accent);
            font-weight: 600;
          }
          .referral-code-box-remove {
            padding: 4px 10px;
            font-size: 0.8rem;
            color: var(--text-muted);
            background: transparent;
            border: 1px solid var(--border);
            border-radius: var(--radius-sm);
            cursor: pointer;
            transition: color 0.2s, border-color 0.2s;
          }
          .referral-code-box-remove:hover {
            color: var(--text);
            border-color: var(--accent);
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="referral-code-box">
      <label htmlFor="referral-code-input" className="referral-code-box-label">
        {t.referralLabel ?? 'Referral code (optional)'}
      </label>
      <div className="referral-code-box-row">
        <input
          id="referral-code-input"
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setError(null);
          }}
          onKeyDown={(e) => e.key === 'Enter' && handleApply()}
          placeholder={t.referralPlaceholder ?? 'Enter code'}
          className="referral-code-box-input"
          autoComplete="off"
          disabled={hasOtherDiscount}
          aria-invalid={!!error}
          aria-describedby={error ? 'referral-code-error' : undefined}
        />
        <button
          type="button"
          className="referral-code-box-apply"
          onClick={handleApply}
          disabled={hasOtherDiscount || subtotal <= 0}
        >
          {t.referralApply ?? 'Apply'}
        </button>
      </div>
      {error && (
        <p id="referral-code-error" className="referral-code-box-error" role="alert">
          {error}
        </p>
      )}
      <style jsx>{`
        .referral-code-box {
          padding: 12px 0;
        }
        .referral-code-box-label {
          display: block;
          font-size: 0.9rem;
          font-weight: 600;
          color: var(--text);
          margin-bottom: 8px;
        }
        .referral-code-box-row {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        @media (min-width: 360px) {
          .referral-code-box-row {
            flex-direction: row;
            align-items: stretch;
          }
          .referral-code-box-input {
            flex: 1;
            min-width: 0;
          }
          .referral-code-box-apply {
            flex-shrink: 0;
          }
        }
        .referral-code-box-input {
          padding: 10px 12px;
          font-size: 0.95rem;
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          background: var(--surface);
          color: var(--text);
        }
        .referral-code-box-input:focus {
          outline: 2px solid var(--accent);
          outline-offset: 2px;
        }
        .referral-code-box-input:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
        .referral-code-box-apply {
          padding: 10px 16px;
          font-size: 0.95rem;
          font-weight: 600;
          color: #fff;
          background: var(--accent);
          border: none;
          border-radius: var(--radius-sm);
          cursor: pointer;
          transition: background 0.2s;
        }
        .referral-code-box-apply:hover:not(:disabled) {
          background: #b39868;
        }
        .referral-code-box-apply:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .referral-code-box-error {
          margin: 8px 0 0;
          font-size: 0.85rem;
          color: var(--text-muted);
        }
      `}</style>
    </div>
  );
}
