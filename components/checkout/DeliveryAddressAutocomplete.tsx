'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { DeliveryFormValues } from '@/components/DeliveryForm';
import type { Locale } from '@/lib/i18n';
import { detectDistrictFromAddress } from '@/lib/deliveryFees';
import { chiangMaiZoneIdFromLegacyDistrict } from '@/lib/delivery/zones';
import { isValidGoogleMapsUrl } from '@/lib/googleMapsUrl';
import { useGooglePlacesScript } from '@/hooks/useGooglePlacesScript';

type PlaceResult = {
  place_id?: string;
  name?: string;
  formatted_address?: string;
  geometry?: { location?: { lat: () => number; lng: () => number } };
};

type AutocompleteInstance = {
  getPlace: () => PlaceResult;
  addListener: (event: string, handler: () => void) => void;
};

type GoogleMapsPlaces = {
  Autocomplete: new (
    input: HTMLInputElement,
    opts: Record<string, unknown>
  ) => AutocompleteInstance;
};

function GoogleMapsPinIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width={18}
      height={18}
      viewBox="0 0 24 24"
      aria-hidden
    >
      <path
        fill="#EA4335"
        d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
      />
      <circle cx="12" cy="9" r="2.25" fill="#fff" />
    </svg>
  );
}

export function DeliveryAddressAutocomplete({
  lang: _lang,
  value,
  onChange,
  restrictToThailand = true,
  biasChiangMai = true,
  inputId = 'checkout-delivery-address',
  highlight = false,
  labels,
}: {
  lang: Locale;
  value: DeliveryFormValues;
  onChange: (v: DeliveryFormValues) => void;
  restrictToThailand?: boolean;
  biasChiangMai?: boolean;
  inputId?: string;
  highlight?: boolean;
  labels: {
    searchPlaceholder: string;
    confirmedChange: string;
    mapsLinkLabel: string;
    mapsLinkHint: string;
    mapsLinkPlaceholder: string;
    openGoogleMapsButton: string;
  };
}) {
  const { ready, hasKey } = useGooglePlacesScript();
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<AutocompleteInstance | null>(null);
  const [query, setQuery] = useState(
    () => value.deliveryPlaceName?.trim() || value.addressLine?.trim() || ''
  );
  useEffect(() => {
    const next = value.deliveryPlaceName?.trim() || value.addressLine?.trim() || '';
    setQuery((prev) => (prev === next ? prev : next));
  }, [value.deliveryPlaceName, value.addressLine]);

  const applyPlace = useCallback(
    (place: PlaceResult) => {
      const lat = place.geometry?.location?.lat?.();
      const lng = place.geometry?.location?.lng?.();
      const formatted = place.formatted_address?.trim() ?? '';
      const name = place.name?.trim() ?? '';
      const placeId = place.place_id?.trim() ?? '';
      const addressLine = formatted || name || value.addressLine;
      const detected = detectDistrictFromAddress(addressLine);
      let deliveryZoneId = value.deliveryZoneId;
      if (detected && detected !== 'MUEANG') {
        const suggested = chiangMaiZoneIdFromLegacyDistrict(detected, false);
        if (suggested) deliveryZoneId = suggested;
      }
      onChange({
        ...value,
        addressLine,
        deliveryPlaceId: placeId || null,
        deliveryPlaceName: name || null,
        deliveryFormattedAddress: formatted || null,
        deliveryLat: typeof lat === 'number' ? lat : value.deliveryLat,
        deliveryLng: typeof lng === 'number' ? lng : value.deliveryLng,
        deliveryZoneId,
        deliveryDistrict: detected ?? value.deliveryDistrict,
      });
      setQuery(name || formatted || addressLine);
    },
    [onChange, value]
  );

  useEffect(() => {
    if (!ready || !hasKey || !inputRef.current || autocompleteRef.current) return;
    const places = (window as unknown as { google: { maps: { places: GoogleMapsPlaces } } })
      .google?.maps?.places;
    if (!places?.Autocomplete) return;

    const opts: Record<string, unknown> = {
      fields: ['place_id', 'name', 'formatted_address', 'geometry'],
    };
    if (restrictToThailand) {
      opts.componentRestrictions = { country: 'th' };
    }
    if (biasChiangMai) {
      opts.bounds = {
        north: 18.95,
        south: 18.65,
        east: 99.05,
        west: 98.85,
      };
      opts.strictBounds = false;
    }

    const ac = new places.Autocomplete(inputRef.current, opts);
    ac.addListener('place_changed', () => {
      const place = ac.getPlace();
      if (place?.place_id || place?.formatted_address) {
        applyPlace(place);
      }
    });
    autocompleteRef.current = ac;
  }, [ready, hasKey, restrictToThailand, biasChiangMai, applyPlace]);

  const confirmed =
    Boolean(value.deliveryPlaceId) ||
    Boolean(value.deliveryFormattedAddress && value.deliveryPlaceName);

  const handleMapsPaste = (raw: string) => {
    const trimmed = raw.trim();
    const next: DeliveryFormValues = {
      ...value,
      deliveryGoogleMapsUrl: trimmed || null,
    };
    if (trimmed && isValidGoogleMapsUrl(trimmed) && !value.addressLine.trim()) {
      next.addressLine = trimmed.length <= 300 ? trimmed : trimmed.slice(0, 300);
    }
    onChange(next);
  };

  const clearPlace = () => {
    onChange({
      ...value,
      deliveryPlaceId: null,
      deliveryPlaceName: null,
      deliveryFormattedAddress: null,
      addressLine: '',
    });
    setQuery('');
    inputRef.current?.focus();
  };

  return (
    <div className={`co-address${highlight ? ' co-address--highlight' : ''}`}>
      <input
        ref={inputRef}
        id={inputId}
        type="text"
        className="co-input co-input--large"
        value={query}
        onChange={(e) => {
          const v = e.target.value;
          setQuery(v);
          if (!confirmed) {
            onChange({ ...value, addressLine: v });
          }
        }}
        placeholder={labels.searchPlaceholder}
        autoComplete="off"
        aria-label={labels.searchPlaceholder}
      />

      {confirmed && (
        <div className="co-address-card">
          <div className="co-address-card-body">
            {value.deliveryPlaceName && (
              <strong className="co-address-card-name">{value.deliveryPlaceName}</strong>
            )}
            <span className="co-address-card-line">
              {value.deliveryFormattedAddress || value.addressLine}
            </span>
          </div>
          <button type="button" className="co-text-btn" onClick={clearPlace}>
            {labels.confirmedChange}
          </button>
        </div>
      )}

      <div className="co-address-extras">
        <div className="co-maps-block">
          <div className="co-maps-row">
            <div className="co-maps-field">
              <label className="co-maps-visually-hidden" htmlFor={`${inputId}-maps`}>
                {labels.mapsLinkLabel}
              </label>
              <input
                id={`${inputId}-maps`}
                type="url"
                className="co-input co-input-maps-inline"
                value={value.deliveryGoogleMapsUrl ?? ''}
                onChange={(e) => handleMapsPaste(e.target.value)}
                placeholder={labels.mapsLinkPlaceholder}
                aria-label={labels.mapsLinkLabel}
                aria-describedby={`${inputId}-maps-hint`}
                inputMode="url"
                autoComplete="off"
              />
            </div>
            <a
              href="https://www.google.com/maps"
              target="_blank"
              rel="noopener noreferrer"
              className="co-maps-open-btn"
            >
              <GoogleMapsPinIcon className="co-maps-open-btn-icon" />
              <span className="co-maps-open-btn-text">{labels.openGoogleMapsButton}</span>
            </a>
          </div>
          <p className="co-maps-hint" id={`${inputId}-maps-hint`}>
            {labels.mapsLinkHint}
          </p>
        </div>
      </div>

      <style jsx>{`
        .co-address {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .co-address--highlight .co-input--large {
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
        }
        .co-input--large {
          min-height: 52px;
        }
        .co-input:focus {
          outline: none;
          border-color: color-mix(in srgb, var(--accent) 45%, var(--border));
        }
        .co-textarea {
          resize: vertical;
          min-height: 72px;
          font-size: 15px;
        }
        .co-address-card {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          padding: 14px 16px;
          border-radius: 14px;
          background: color-mix(in srgb, var(--pastel-mint) 45%, #fff);
          border: 1px solid color-mix(in srgb, var(--primary) 12%, var(--border));
        }
        .co-address-card-body {
          display: flex;
          flex-direction: column;
          gap: 4px;
          min-width: 0;
        }
        .co-address-card-name {
          font-size: 15px;
          font-weight: 600;
          color: var(--text);
        }
        .co-address-card-line {
          font-size: 14px;
          color: var(--text-muted);
          line-height: 1.4;
        }
        .co-text-btn {
          border: none;
          background: none;
          padding: 0;
          font-size: 13px;
          font-weight: 600;
          color: var(--primary);
          cursor: pointer;
          font-family: inherit;
          white-space: nowrap;
        }
        .co-text-btn--subtle {
          color: var(--text-muted);
          font-weight: 500;
        }
        .co-address-extras {
          width: 100%;
        }
        .co-maps-block {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 6px;
          padding: 10px 12px;
          border-radius: 12px;
          background: color-mix(in srgb, var(--pastel-mint) 35%, #fff);
          border: 1px solid color-mix(in srgb, var(--primary) 10%, var(--border));
          box-sizing: border-box;
        }
        .co-maps-row {
          display: flex;
          flex-wrap: nowrap;
          align-items: stretch;
          gap: 8px;
        }
        .co-maps-field {
          flex: 1 1 0;
          min-width: 0;
          display: flex;
          flex-direction: column;
        }
        .co-input-maps-inline {
          min-height: 44px;
          padding: 10px 12px;
          font-size: 15px;
          border-radius: 10px;
          width: 100%;
          flex: 1;
        }
        .co-maps-open-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          flex-shrink: 0;
          min-height: 44px;
          padding: 10px 12px;
          border-radius: 10px;
          border: 1px solid color-mix(in srgb, var(--primary) 22%, var(--border));
          background: #fff;
          color: var(--text);
          font-size: 13px;
          font-weight: 600;
          font-family: inherit;
          text-decoration: none;
          cursor: pointer;
          transition:
            border-color 0.15s,
            box-shadow 0.15s;
          line-height: 1.25;
          box-sizing: border-box;
        }
        .co-maps-open-btn:hover {
          border-color: color-mix(in srgb, var(--primary) 45%, var(--border));
          box-shadow: 0 1px 6px rgba(0, 0, 0, 0.05);
        }
        .co-maps-open-btn:focus-visible {
          outline: none;
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent-soft) 70%, transparent);
        }
        .co-maps-open-btn-icon {
          flex-shrink: 0;
        }
        .co-maps-open-btn-text {
          text-align: left;
        }
        .co-maps-visually-hidden {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          clip-path: inset(50%);
          white-space: nowrap;
          border: 0;
        }
        .co-maps-hint {
          margin: 0;
          font-size: 12px;
          line-height: 1.4;
          color: var(--text-muted);
        }
      `}</style>
    </div>
  );
}
