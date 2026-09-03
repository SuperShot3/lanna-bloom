'use client';

import { useEffect, useRef, useState } from 'react';
import type { DeliveryFormValues } from '@/components/DeliveryForm';
import {
  DeliveryLocationPicker,
  type DeliveryLocationValue,
} from '@/components/DeliveryLocationPicker';
import { NotchedField } from '@/components/checkout/NotchedField';
import { CHECKOUT_FIELD_LIMITS, clipCheckoutField } from '@/lib/checkout/checkoutFieldLimits';
import { buildDriverMapsSearchUrl } from '@/lib/google/buildDriverMapsUrl';
import type { Locale } from '@/lib/i18n';

export function DeliveryAddressFields({
  lang: _lang,
  value,
  onChange,
  inputId = 'checkout-delivery-address',
  highlight = false,
  highlightMapsLink = false,
  labels,
}: {
  lang: Locale;
  value: DeliveryFormValues;
  onChange: (v: DeliveryFormValues) => void;
  inputId?: string;
  highlight?: boolean;
  highlightMapsLink?: boolean;
  labels: {
    addressLabel: string;
    addressPlaceholder: string;
    deliveryNoteLabel: string;
    deliveryNotePlaceholder: string;
    deliveryNoteHint: string;
    googleMapsLinkLabel: string;
    dropPinPrompt: string;
    selectedLocationLabel: string;
    openGoogleMapsAriaLabel: string;
    mapUnavailableLabel: string;
  };
}) {
  const [addressDraft, setAddressDraft] = useState(
    () => value.deliveryFormattedAddress ?? value.addressLine ?? ''
  );
  const [noteDraft, setNoteDraft] = useState(() => value.deliveryNote ?? '');
  const addressFocusedRef = useRef(false);
  const noteFocusedRef = useRef(false);
  const [showNoteHint, setShowNoteHint] = useState(false);

  useEffect(() => {
    if (addressFocusedRef.current) return;
    const synced = value.deliveryFormattedAddress ?? value.addressLine ?? '';
    setAddressDraft(synced);
  }, [value.deliveryFormattedAddress, value.addressLine]);

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
      deliveryAddressComponents: null,
      deliveryPostalCode: null,
      deliveryProvince: null,
      deliveryDistrictLabel: null,
      deliverySubdistrict: null,
    });
  };

  const onPinChange = (pin: DeliveryLocationValue | null) => {
    onChange({
      ...value,
      deliveryLat: pin?.lat ?? null,
      deliveryLng: pin?.lng ?? null,
      deliveryGoogleMapsUrl: pin?.googleMapsUrl ?? null,
    });
  };

  const onNoteChange = (note: string) => {
    const clipped = clipCheckoutField(note, 'deliveryNote');
    setNoteDraft(clipped);
    onChange({ ...value, deliveryNote: clipped });
    if (clipped.trim()) setShowNoteHint(false);
  };

  const addressId = `${inputId}-manual`;
  const mapId = `${inputId}-map`;
  const noteId = `${inputId}-note`;
  const pinValue: DeliveryLocationValue | null =
    typeof value.deliveryLat === 'number' && typeof value.deliveryLng === 'number'
      ? {
          lat: value.deliveryLat,
          lng: value.deliveryLng,
          googleMapsUrl:
            value.deliveryGoogleMapsUrl ??
            buildDriverMapsSearchUrl(value.deliveryLat, value.deliveryLng),
        }
      : null;

  return (
    <div className={`co-address${highlight ? ' co-address--highlight' : ''}`}>
      <NotchedField id={addressId} label={labels.addressLabel}>
        <textarea
          id={addressId}
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
      </NotchedField>

      <div className="co-map-field">
        <p className="co-map-label" id={`${mapId}-label`}>
          {labels.googleMapsLinkLabel}
        </p>
        <DeliveryLocationPicker
          value={pinValue}
          onChange={onPinChange}
          destinationId={value.deliveryDestination}
          highlight={highlightMapsLink}
          mapElementId={mapId}
          dropPinPrompt={labels.dropPinPrompt}
          selectedLocationLabel={labels.selectedLocationLabel}
          openInGoogleMapsLabel={labels.openGoogleMapsAriaLabel}
          mapUnavailableLabel={labels.mapUnavailableLabel}
        />
      </div>

      <NotchedField
        id={noteId}
        label={labels.deliveryNoteLabel}
        hint={
          showNoteHint && !value.deliveryNote?.trim() ? (
            <p className="co-address-note-hint">{labels.deliveryNoteHint}</p>
          ) : null
        }
      >
        <input
          id={noteId}
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
      </NotchedField>

      <style jsx>{`
        .co-address {
          display: flex;
          flex-direction: column;
          gap: 14px;
          overflow: visible;
        }
        .co-address--highlight :global(.co-textarea) {
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
          background: var(--surface);
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
        .co-map-label {
          margin: 0 0 8px;
          font-size: 13px;
          font-weight: 600;
          color: var(--text-muted);
        }
        .co-textarea {
          resize: vertical;
          min-height: 88px;
          font-size: 16px;
          line-height: 1.45;
        }
        :global(.co-address-note-hint) {
          margin: 0;
          font-size: 13px;
          line-height: 1.45;
          color: color-mix(in srgb, var(--accent) 70%, var(--text-muted));
        }
      `}</style>
    </div>
  );
}
