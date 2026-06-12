'use client';

import { useEffect, useRef, useState } from 'react';
import type { DeliveryFormValues } from '@/components/DeliveryForm';
import { CHECKOUT_FIELD_LIMITS, clipCheckoutField } from '@/lib/checkout/checkoutFieldLimits';
import type { Locale } from '@/lib/i18n';

const GOOGLE_MAPS_OPEN_URL = 'https://www.google.com/maps';

export function DeliveryAddressFields({
  lang: _lang,
  value,
  onChange,
  inputId = 'checkout-delivery-address',
  highlight = false,
  labels,
}: {
  lang: Locale;
  value: DeliveryFormValues;
  onChange: (v: DeliveryFormValues) => void;
  inputId?: string;
  highlight?: boolean;
  labels: {
    addressLabel: string;
    addressPlaceholder: string;
    deliveryNoteLabel: string;
    deliveryNotePlaceholder: string;
    deliveryNoteHint: string;
    googleMapsLinkPlaceholder: string;
    googleMapsLinkHint: string;
    openGoogleMapsAriaLabel: string;
  };
}) {
  const [addressDraft, setAddressDraft] = useState(
    () => value.deliveryFormattedAddress ?? value.addressLine ?? ''
  );
  const [mapsLinkDraft, setMapsLinkDraft] = useState(() => value.deliveryGoogleMapsUrl ?? '');
  const [noteDraft, setNoteDraft] = useState(() => value.deliveryNote ?? '');
  const addressFocusedRef = useRef(false);
  const mapsLinkFocusedRef = useRef(false);
  const noteFocusedRef = useRef(false);
  const [showNoteHint, setShowNoteHint] = useState(false);

  useEffect(() => {
    if (addressFocusedRef.current) return;
    const synced = value.deliveryFormattedAddress ?? value.addressLine ?? '';
    setAddressDraft(synced);
  }, [value.deliveryFormattedAddress, value.addressLine]);

  useEffect(() => {
    if (mapsLinkFocusedRef.current) return;
    setMapsLinkDraft(value.deliveryGoogleMapsUrl ?? '');
  }, [value.deliveryGoogleMapsUrl]);

  useEffect(() => {
    if (noteFocusedRef.current) return;
    setNoteDraft(value.deliveryNote ?? '');
  }, [value.deliveryNote]);

  const onAddressChange = (text: string) => {
    const clipped = clipCheckoutField(text, 'deliveryAddress');
    setAddressDraft(clipped);
    onChange({
      ...value,
      addressLine: clipped,
      deliveryFormattedAddress: clipped || null,
      deliveryPlaceId: null,
      deliveryPlaceName: null,
      deliveryLat: null,
      deliveryLng: null,
      deliveryAddressComponents: null,
      deliveryPostalCode: null,
      deliveryProvince: null,
      deliveryDistrictLabel: null,
      deliverySubdistrict: null,
    });
  };

  const onMapsLinkChange = (url: string) => {
    const clipped = clipCheckoutField(url, 'googleMapsUrl');
    setMapsLinkDraft(clipped);
    onChange({
      ...value,
      deliveryGoogleMapsUrl: clipped || null,
    });
  };

  const onNoteChange = (note: string) => {
    const clipped = clipCheckoutField(note, 'deliveryNote');
    setNoteDraft(clipped);
    onChange({ ...value, deliveryNote: clipped });
    if (clipped.trim()) setShowNoteHint(false);
  };

  return (
    <div className={`co-address${highlight ? ' co-address--highlight' : ''}`}>
      <div className="co-field co-field--tight">
        <label className="co-label" htmlFor={`${inputId}-manual`}>
          {labels.addressLabel}
        </label>
        <textarea
          id={`${inputId}-manual`}
          className="co-input co-textarea"
          value={addressDraft}
          onChange={(e) => onAddressChange(e.target.value)}
          onFocus={() => {
            addressFocusedRef.current = true;
          }}
          onBlur={() => {
            addressFocusedRef.current = false;
          }}
          placeholder={labels.addressPlaceholder}
          rows={3}
          maxLength={CHECKOUT_FIELD_LIMITS.deliveryAddress}
        />
      </div>

      <div className="co-field co-field--tight">
        <div className="co-maps-link-row">
          <input
            id={`${inputId}-maps-link`}
            type="url"
            inputMode="url"
            className="co-input co-maps-link-input"
            value={mapsLinkDraft}
            onChange={(e) => onMapsLinkChange(e.target.value)}
            onFocus={() => {
              mapsLinkFocusedRef.current = true;
            }}
            onBlur={() => {
              mapsLinkFocusedRef.current = false;
              const trimmed = mapsLinkDraft.trim();
              if (trimmed !== mapsLinkDraft) {
                setMapsLinkDraft(trimmed);
                onChange({
                  ...value,
                  deliveryGoogleMapsUrl: trimmed || null,
                });
              }
            }}
            placeholder={labels.googleMapsLinkPlaceholder}
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            maxLength={CHECKOUT_FIELD_LIMITS.googleMapsUrl}
            aria-describedby={`${inputId}-maps-link-hint`}
          />
          <a
            href={GOOGLE_MAPS_OPEN_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="co-maps-link-btn"
            aria-label={labels.openGoogleMapsAriaLabel}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/icons/google-maps-old-svgrepo-com.svg"
              alt=""
              className="co-maps-link-btn-icon"
              width={26}
              height={26}
              decoding="async"
            />
          </a>
        </div>
        <p id={`${inputId}-maps-link-hint`} className="co-maps-link-hint">
          {labels.googleMapsLinkHint}
        </p>
      </div>

      <div className="co-field co-field--tight">
        <label className="co-label" htmlFor={`${inputId}-note`}>
          {labels.deliveryNoteLabel}
        </label>
        <input
          id={`${inputId}-note`}
          type="text"
          className="co-input"
          value={noteDraft}
          onChange={(e) => onNoteChange(e.target.value)}
          onFocus={() => {
            noteFocusedRef.current = true;
          }}
          onBlur={() => {
            noteFocusedRef.current = false;
            if (!noteDraft.trim()) setShowNoteHint(true);
          }}
          placeholder={labels.deliveryNotePlaceholder}
            maxLength={CHECKOUT_FIELD_LIMITS.deliveryNote}
          autoComplete="off"
        />
        {showNoteHint && !value.deliveryNote?.trim() && (
          <p className="co-address-note-hint">{labels.deliveryNoteHint}</p>
        )}
      </div>

      <style jsx>{`
        .co-address {
          display: flex;
          flex-direction: column;
          gap: 12px;
          overflow: visible;
        }
        .co-field--tight {
          display: flex;
          flex-direction: column;
          gap: 6px;
          overflow: visible;
        }
        .co-address--highlight .co-textarea {
          border-color: color-mix(in srgb, var(--accent) 55%, var(--border));
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent-soft) 65%, transparent);
        }
        .co-input {
          width: 100%;
          padding: 14px 16px;
          border: 1px solid var(--border);
          border-radius: 14px;
          font-size: 16px;
          font-family: inherit;
          color: var(--text);
          background: #fff;
          box-sizing: border-box;
          transition:
            border-color 0.2s ease,
            box-shadow 0.2s ease;
          -webkit-appearance: none;
          appearance: none;
        }
        .co-input:focus {
          outline: none;
          border-color: color-mix(in srgb, var(--accent) 45%, var(--border));
        }
        .co-maps-link-row {
          display: flex;
          align-items: stretch;
          border: 1px solid var(--border);
          border-radius: 14px;
          overflow: hidden;
          background: #fff;
        }
        .co-maps-link-row:focus-within {
          border-color: color-mix(in srgb, var(--accent) 45%, var(--border));
        }
        .co-maps-link-input {
          flex: 1;
          min-width: 0;
          border: none !important;
          border-radius: 0 !important;
          box-shadow: none !important;
          min-height: 48px;
          padding: 12px 14px;
          font-size: 15px;
        }
        .co-maps-link-input:focus {
          outline: none;
          border: none;
        }
        .co-maps-link-btn {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 52px;
          min-height: 48px;
          padding: 0;
          border: none;
          border-left: 1px solid var(--border);
          background: color-mix(in srgb, var(--pastel-cream) 70%, #fff);
          text-decoration: none;
          cursor: pointer;
          touch-action: manipulation;
          -webkit-tap-highlight-color: transparent;
          transition: background 0.15s ease;
        }
        .co-maps-link-btn:hover {
          background: var(--pastel-cream);
        }
        .co-maps-link-btn-icon {
          flex-shrink: 0;
          display: block;
          width: 26px;
          height: 26px;
          object-fit: contain;
        }
        .co-maps-link-hint {
          margin: 0;
          font-size: 12px;
          line-height: 1.4;
          color: var(--text-muted);
        }
        .co-textarea {
          resize: vertical;
          min-height: 88px;
          font-size: 16px;
          line-height: 1.45;
        }
        .co-address-note-hint {
          margin: 0;
          font-size: 13px;
          line-height: 1.45;
          color: color-mix(in srgb, var(--accent) 70%, var(--text-muted));
        }
      `}</style>
    </div>
  );
}
