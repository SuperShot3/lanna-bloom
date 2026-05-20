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
    manualFallbackLabel: string;
    manualFallbackPlaceholder: string;
    mapsLinkPlaceholder: string;
    addressUncertain: string;
  };
}) {
  const { ready, hasKey } = useGooglePlacesScript();
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<AutocompleteInstance | null>(null);
  const [query, setQuery] = useState(
    () => value.deliveryPlaceName?.trim() || value.addressLine?.trim() || ''
  );
  const [showManual, setShowManual] = useState(false);

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
      setShowManual(false);
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
        <button
          type="button"
          className="co-text-btn co-text-btn--subtle"
          onClick={() => setShowManual((s) => !s)}
        >
          {labels.manualFallbackLabel}
        </button>
        {showManual && (
          <div className="co-address-manual">
            <textarea
              className="co-input co-textarea"
              rows={2}
              value={value.addressLine}
              onChange={(e) =>
                onChange({
                  ...value,
                  addressLine: e.target.value.slice(0, 300),
                  deliveryPlaceId: null,
                  deliveryPlaceName: null,
                  deliveryFormattedAddress: null,
                })
              }
              placeholder={labels.manualFallbackPlaceholder}
              aria-label={labels.manualFallbackPlaceholder}
            />
            <input
              type="url"
              className="co-input"
              value={value.deliveryGoogleMapsUrl ?? ''}
              onChange={(e) => handleMapsPaste(e.target.value)}
              placeholder={labels.mapsLinkPlaceholder}
              aria-label={labels.mapsLinkPlaceholder}
            />
            {!confirmed && value.addressLine.trim().length >= 10 && !value.deliveryPlaceId && (
              <p className="co-inline-hint">{labels.addressUncertain}</p>
            )}
          </div>
        )}
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
          display: flex;
          flex-direction: column;
          gap: 8px;
          align-items: flex-start;
        }
        .co-address-manual {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .co-inline-hint {
          margin: 0;
          font-size: 13px;
          line-height: 1.45;
          color: var(--text-muted);
        }
      `}</style>
    </div>
  );
}
