'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { CartItem } from '@/contexts/CartContext';
import { FacebookIcon, LineIcon, WhatsAppIcon } from '@/components/icons';
import {
  buildCartSummaryForLocationRequest,
  buildDeliveryLocationRequestMessage,
  clipLocationText,
  DELIVERY_LOCATION_TEXT_MAX,
  hasDeliveryLocationInput,
  isValidDeliveryLocationEmail,
} from '@/lib/delivery/deliveryLocationRequestClient';
import {
  trackDeliveryLocationRequestOpen,
  trackDeliveryLocationRequestSubmit,
  trackDeliveryLocationRequestValidationError,
  trackMessengerClick,
  trackCtaClick,
} from '@/lib/analytics';
import { getFacebookOrderUrl, getLineContactUrl, getWhatsAppOrderUrl } from '@/lib/messenger';
import { translations } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';
import {
  CHECKOUT_FIELD_LIMITS,
  clipCheckoutField,
} from '@/lib/checkout/checkoutFieldLimits';
import { isValidGoogleMapsUrl } from '@/lib/googleMapsUrl';

export type DeliveryLocationRequestModalProps = {
  lang: Locale;
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  customerName: string;
  countryCode: string;
  phoneNational: string;
  customerEmail: string;
  triggerRef?: React.RefObject<HTMLElement | null>;
};

function formatPhoneForMessage(countryCode: string, phoneNational: string): string {
  const digits = phoneNational.replace(/\D/g, '');
  const cc = countryCode.replace(/\D/g, '') || '66';
  return `+${cc}${digits}`;
}

export function DeliveryLocationRequestModal({
  lang,
  isOpen,
  onClose,
  items,
  customerName: initialName,
  countryCode,
  phoneNational: initialPhone,
  customerEmail: initialEmail,
  triggerRef,
}: DeliveryLocationRequestModalProps) {
  const t = translations[lang].cart as Record<string, string>;
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const [locationText, setLocationText] = useState('');
  const [googleMapsUrl, setGoogleMapsUrl] = useState('');
  const [customerName, setCustomerName] = useState(initialName);
  const [phoneNational, setPhoneNational] = useState(initialPhone);
  const [customerEmail, setCustomerEmail] = useState(initialEmail);
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setCustomerName(initialName);
    setPhoneNational(initialPhone);
    setCustomerEmail(initialEmail);
    setSuccess(false);
    setError(null);
    trackDeliveryLocationRequestOpen();
  }, [isOpen, initialName, initialPhone, initialEmail]);

  useEffect(() => {
    if (!isOpen) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    closeButtonRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        triggerRef?.current?.focus();
      }
      if (e.key === 'Tab') {
        const el = modalRef.current;
        if (!el) return;
        const focusable = el.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
      previouslyFocused?.focus();
    };
  }, [isOpen, onClose, triggerRef]);

  const buildMessage = useCallback(() => {
    const cartSummary = buildCartSummaryForLocationRequest(items, lang);
    return buildDeliveryLocationRequestMessage({
      lang,
      locationText,
      googleMapsUrl,
      customerName: customerName.trim(),
      customerEmail: customerEmail.trim(),
      customerPhone: phoneNational.trim()
        ? formatPhoneForMessage(countryCode, phoneNational)
        : undefined,
      cartSummary,
    });
  }, [
    items,
    lang,
    locationText,
    googleMapsUrl,
    customerName,
    customerEmail,
    countryCode,
    phoneNational,
  ]);

  const validateClient = useCallback((): string | null => {
    if (!hasDeliveryLocationInput(locationText, googleMapsUrl)) {
      if (googleMapsUrl.trim() && !isValidGoogleMapsUrl(googleMapsUrl.trim())) {
        return t.mapsUrlInvalid ?? t.deliveryLocationLocationRequired;
      }
      return t.deliveryLocationLocationRequired;
    }
    if (!customerName.trim()) return t.deliveryLocationNameRequired;
    const emailTrim = customerEmail.trim();
    if (!emailTrim) return t.deliveryLocationEmailRequired;
    if (!isValidDeliveryLocationEmail(emailTrim)) {
      return translations[lang].cart.emailInvalid ?? t.deliveryLocationEmailRequired;
    }
    const phoneDigits = phoneNational.replace(/\D/g, '');
    if (phoneDigits.length > 0 && phoneDigits.length < 8) {
      return translations[lang].cart.contactPhoneMinLength ?? 'Phone number must be at least 8 digits.';
    }
    if (!consent) return t.deliveryLocationConsentRequired;
    return null;
  }, [locationText, googleMapsUrl, customerName, customerEmail, phoneNational, consent, lang, t]);

  const handleMessengerClick = (channel: 'whatsapp' | 'facebook' | 'line') => {
    const err = validateClient();
    if (err) {
      setError(err);
      trackDeliveryLocationRequestValidationError(err);
      return;
    }
    setError(null);
    const message = buildMessage();
    if (channel === 'line') {
      const href = getLineContactUrl();
      trackMessengerClick({ channel: 'line', page_location: 'cart', link_url: href });
      window.open(href, '_blank', 'noopener,noreferrer');
      return;
    }
    const href =
      channel === 'whatsapp'
        ? getWhatsAppOrderUrl(message)
        : getFacebookOrderUrl(message);
    if (channel === 'whatsapp') {
      trackMessengerClick({ channel: 'whatsapp', page_location: 'cart', link_url: href });
    } else {
      trackCtaClick('delivery_location_request_facebook_click', {
        page_path: window.location.pathname,
      });
    }
    window.open(href, '_blank', 'noopener,noreferrer');
  };

  const handleSubmit = async () => {
    const err = validateClient();
    if (err) {
      setError(err);
      trackDeliveryLocationRequestValidationError(err);
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/delivery-location-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lang,
          locationText,
          googleMapsUrl,
          customerName: customerName.trim(),
          customerPhone: phoneNational.trim()
            ? formatPhoneForMessage(countryCode, phoneNational)
            : '',
          customerEmail: customerEmail.trim(),
          consentAccepted: true,
          items,
          sourcePath: typeof window !== 'undefined' ? window.location.pathname : undefined,
          submissionChannel: 'form',
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) {
        setError(data.error ?? t.deliveryLocationError);
        return;
      }
      trackDeliveryLocationRequestSubmit();
      setSuccess(true);
    } catch {
      setError(t.deliveryLocationError);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const locationReady = hasDeliveryLocationInput(locationText, googleMapsUrl);

  return (
    <div
      className="dlr-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dlr-title"
      ref={modalRef}
    >
      <div
        className="dlr-backdrop"
        onClick={onClose}
        onKeyDown={(e) => e.key === 'Enter' && onClose()}
        role="button"
        tabIndex={0}
        aria-label="Close"
      />
      <div className="dlr-sheet">
        <div className="dlr-handle" aria-hidden />
        <div className="dlr-header">
          <h2 id="dlr-title" className="dlr-title">
            {t.deliveryLocationModalTitle}
          </h2>
          <button
            type="button"
            className="dlr-close"
            onClick={onClose}
            ref={closeButtonRef}
            aria-label="Close"
          >
            <span aria-hidden>×</span>
          </button>
        </div>

        {success ? (
          <div className="dlr-body">
            <p className="dlr-success">{t.deliveryLocationSuccess}</p>
            <button type="button" className="dlr-submit" onClick={onClose}>
              OK
            </button>
          </div>
        ) : (
          <>
            <div className="dlr-body">
              <p className="dlr-intro">{t.deliveryLocationModalIntro}</p>

              <div className="dlr-field">
                <label className="dlr-label" htmlFor="dlr-location-text">
                  {t.deliveryLocationTextLabel}
                </label>
                <textarea
                  id="dlr-location-text"
                  className="dlr-input dlr-textarea"
                  value={locationText}
                  onChange={(e) => setLocationText(clipLocationText(e.target.value))}
                  placeholder={t.deliveryLocationTextPlaceholder}
                  maxLength={DELIVERY_LOCATION_TEXT_MAX}
                  rows={3}
                />
              </div>

              <div className="dlr-field">
                <label className="dlr-label" htmlFor="dlr-maps-url">
                  {t.deliveryLocationMapsLabel}
                </label>
                <input
                  id="dlr-maps-url"
                  type="url"
                  className="dlr-input"
                  value={googleMapsUrl}
                  onChange={(e) =>
                    setGoogleMapsUrl(clipCheckoutField(e.target.value, 'googleMapsUrl'))
                  }
                  placeholder={t.deliveryLocationMapsPlaceholder}
                  maxLength={CHECKOUT_FIELD_LIMITS.googleMapsUrl}
                />
              </div>

              <p className="dlr-hint">{t.deliveryLocationHint}</p>

              <div className="dlr-field">
                <label className="dlr-label" htmlFor="dlr-name">
                  {translations[lang].cart.senderName ?? 'Name'}
                </label>
                <input
                  id="dlr-name"
                  type="text"
                  className="dlr-input"
                  value={customerName}
                  onChange={(e) =>
                    setCustomerName(clipCheckoutField(e.target.value, 'customerName'))
                  }
                  maxLength={CHECKOUT_FIELD_LIMITS.customerName}
                />
              </div>

              <div className="dlr-field">
                <label className="dlr-label" htmlFor="dlr-email">
                  {translations[lang].cart.emailLabel ?? 'Email'}{' '}
                  <span className="dlr-req" aria-hidden>*</span>
                </label>
                <input
                  id="dlr-email"
                  type="email"
                  className="dlr-input"
                  value={customerEmail}
                  onChange={(e) =>
                    setCustomerEmail(clipCheckoutField(e.target.value, 'customerEmail'))
                  }
                  maxLength={CHECKOUT_FIELD_LIMITS.customerEmail}
                  placeholder={translations[lang].cart.emailPlaceholder}
                  autoComplete="email"
                  inputMode="email"
                  required
                  aria-required
                />
                <p className="dlr-field-hint">{t.deliveryLocationEmailHint}</p>
              </div>

              <div className="dlr-field">
                <label className="dlr-label" htmlFor="dlr-phone">
                  {t.deliveryLocationPhoneOptional}
                </label>
                <input
                  id="dlr-phone"
                  type="tel"
                  inputMode="numeric"
                  className="dlr-input"
                  value={phoneNational}
                  onChange={(e) =>
                    setPhoneNational(
                      clipCheckoutField(e.target.value.replace(/\D/g, ''), 'phoneNational')
                    )
                  }
                  maxLength={CHECKOUT_FIELD_LIMITS.phoneNational}
                />
              </div>

              <label className="dlr-consent">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                />
                <span>{t.deliveryLocationConsentLabel}</span>
              </label>

              {error ? <p className="dlr-error" role="alert">{error}</p> : null}

              <p className="dlr-messenger-title">{t.deliveryLocationMessengerTitle}</p>
              <div className="dlr-messenger-grid">
                <button
                  type="button"
                  className="dlr-messenger-btn dlr-messenger-btn--line"
                  disabled={!locationReady}
                  onClick={() => handleMessengerClick('line')}
                >
                  <LineIcon size={22} />
                  <span>{t.deliveryLocationLine}</span>
                </button>
                <button
                  type="button"
                  className="dlr-messenger-btn dlr-messenger-btn--wa"
                  disabled={!locationReady}
                  onClick={() => handleMessengerClick('whatsapp')}
                >
                  <WhatsAppIcon size={22} />
                  <span>WhatsApp</span>
                </button>
                <button
                  type="button"
                  className="dlr-messenger-btn dlr-messenger-btn--fb"
                  disabled={!locationReady}
                  onClick={() => handleMessengerClick('facebook')}
                >
                  <FacebookIcon size={22} />
                  <span>{t.deliveryLocationFacebook}</span>
                </button>
              </div>
            </div>

            <div className="dlr-footer">
              <button
                type="button"
                className="dlr-submit"
                disabled={submitting || !locationReady}
                onClick={() => void handleSubmit()}
              >
                {submitting ? t.deliveryLocationSubmitting : t.deliveryLocationSubmit}
              </button>
            </div>
          </>
        )}
      </div>

      <style jsx>{`
        .dlr-overlay {
          position: fixed;
          inset: 0;
          z-index: 250;
          display: flex;
          align-items: flex-end;
          justify-content: center;
        }
        @media (min-width: 641px) {
          .dlr-overlay {
            align-items: center;
            padding: 20px;
          }
        }
        .dlr-backdrop {
          position: absolute;
          inset: 0;
          background: rgba(45, 42, 38, 0.45);
          cursor: pointer;
        }
        .dlr-sheet {
          position: relative;
          width: 100%;
          max-width: 480px;
          max-height: min(92dvh, 720px);
          display: flex;
          flex-direction: column;
          background: var(--surface, #fff);
          border-radius: 20px 20px 0 0;
          box-shadow: 0 -4px 32px rgba(0, 0, 0, 0.14);
          animation: dlr-slide-up 0.32s cubic-bezier(0.33, 1, 0.68, 1);
        }
        @media (min-width: 641px) {
          .dlr-sheet {
            border-radius: var(--radius, 16px);
            max-height: min(85vh, 720px);
            animation: dlr-fade-in 0.24s ease-out;
          }
        }
        @keyframes dlr-slide-up {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        @keyframes dlr-fade-in {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .dlr-handle {
          width: 36px;
          height: 4px;
          border-radius: 2px;
          background: var(--border, #ddd);
          margin: 10px auto 0;
          flex-shrink: 0;
        }
        @media (min-width: 641px) {
          .dlr-handle {
            display: none;
          }
        }
        .dlr-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          padding: 12px 16px 8px;
          flex-shrink: 0;
        }
        .dlr-title {
          font-family: var(--font-serif);
          font-size: 1.15rem;
          font-weight: 600;
          margin: 0;
          color: var(--text);
          line-height: 1.3;
        }
        .dlr-close {
          flex-shrink: 0;
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          background: transparent;
          border: none;
          border-radius: var(--radius-sm, 8px);
          color: var(--text-muted);
          font-size: 1.5rem;
          cursor: pointer;
        }
        .dlr-body {
          flex: 1;
          overflow-y: auto;
          padding: 0 16px 12px;
          -webkit-overflow-scrolling: touch;
        }
        .dlr-intro {
          font-size: 0.9rem;
          color: var(--text-muted);
          margin: 0 0 14px;
          line-height: 1.45;
        }
        .dlr-field {
          margin-bottom: 12px;
        }
        .dlr-label {
          display: block;
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--text-muted);
          margin-bottom: 6px;
        }
        .dlr-req {
          color: #b42318;
        }
        .dlr-field-hint {
          font-size: 0.75rem;
          color: var(--text-muted);
          margin: 6px 0 0;
          line-height: 1.35;
        }
        .dlr-input {
          width: 100%;
          padding: 12px;
          border: 1px solid var(--border);
          border-radius: 10px;
          font-size: 16px;
          font-family: inherit;
          color: var(--text);
          background: var(--bg, #fff);
          box-sizing: border-box;
        }
        .dlr-textarea {
          resize: vertical;
          min-height: 72px;
        }
        .dlr-hint {
          font-size: 0.8rem;
          color: var(--text-muted);
          margin: 0 0 14px;
          line-height: 1.4;
        }
        .dlr-consent {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          font-size: 0.85rem;
          line-height: 1.4;
          color: var(--text);
          margin: 8px 0 12px;
          cursor: pointer;
        }
        .dlr-consent input {
          margin-top: 3px;
          flex-shrink: 0;
          width: 18px;
          height: 18px;
        }
        .dlr-error {
          color: #b42318;
          font-size: 0.85rem;
          margin: 0 0 10px;
        }
        .dlr-success {
          font-size: 0.95rem;
          line-height: 1.5;
          color: var(--text);
          margin: 0 0 16px;
        }
        .dlr-messenger-title {
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--text-muted);
          margin: 4px 0 10px;
        }
        .dlr-messenger-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
          margin-bottom: 4px;
        }
        .dlr-messenger-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 6px;
          min-height: 64px;
          padding: 10px 8px;
          border-radius: 12px;
          border: 1px solid var(--border);
          background: var(--bg, #fff);
          font-size: 0.8rem;
          font-weight: 600;
          font-family: inherit;
          cursor: pointer;
          color: var(--text);
        }
        .dlr-messenger-btn:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }
        .dlr-messenger-btn--line:not(:disabled):hover {
          border-color: #00b900;
          background: rgba(0, 185, 0, 0.06);
        }
        .dlr-messenger-btn--wa:not(:disabled):hover {
          border-color: #25d366;
          background: rgba(37, 211, 102, 0.06);
        }
        .dlr-messenger-btn--fb:not(:disabled):hover {
          border-color: #1877f2;
          background: rgba(24, 119, 242, 0.06);
        }
        .dlr-footer {
          flex-shrink: 0;
          padding: 12px 16px calc(16px + env(safe-area-inset-bottom, 0px));
          border-top: 1px solid var(--border);
          background: var(--surface, #fff);
        }
        .dlr-submit {
          width: 100%;
          min-height: 48px;
          padding: 0 20px;
          border: none;
          border-radius: 12px;
          background: var(--primary, #1a3c34);
          color: #fff;
          font-size: 16px;
          font-weight: 600;
          font-family: inherit;
          cursor: pointer;
        }
        .dlr-submit:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }
        .dlr-submit:not(:disabled):hover {
          opacity: 0.92;
        }
      `}</style>
    </div>
  );
}
