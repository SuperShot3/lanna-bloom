'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { DeliveryFormValues } from '@/components/DeliveryForm';
import type { Locale } from '@/lib/i18n';
import { detectDistrictFromAddress } from '@/lib/deliveryFees';
import { chiangMaiZoneIdFromLegacyDistrict } from '@/lib/delivery/zones';
import {
  buildDriverMapsSearchUrl,
  buildStaticMapPreviewUrl,
} from '@/lib/google/buildDriverMapsUrl';
import {
  parsePlacesAddressComponents,
  type GoogleAddressComponent,
} from '@/lib/google/placesAddressComponents';
import { trackDeliveryAddressSelected } from '@/lib/analytics/gtag';
import { useGooglePlacesScript } from '@/hooks/useGooglePlacesScript';

const PLACE_DETAIL_FIELDS = [
  'place_id',
  'name',
  'formatted_address',
  'geometry',
  'address_components',
] as const;

const CHIANG_MAI_BOUNDS: google.maps.LatLngBoundsLiteral = {
  north: 18.95,
  south: 18.65,
  east: 99.05,
  west: 98.85,
};

function hasConfirmedPlace(value: DeliveryFormValues): boolean {
  return Boolean(
    value.deliveryPlaceId?.trim() &&
      value.deliveryFormattedAddress?.trim() &&
      typeof value.deliveryLat === 'number' &&
      typeof value.deliveryLng === 'number'
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
    addressLabel: string;
    searchPlaceholder: string;
    helperText: string;
    confirmedChange: string;
    deliveryNoteLabel: string;
    deliveryNotePlaceholder: string;
    deliveryNoteHint: string;
    manualLabel: string;
    manualPlaceholder: string;
  };
}) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ?? '';
  const { ready, hasKey, loadError } = useGooglePlacesScript();
  const useGoogle = hasKey && ready && !loadError;

  const helperId = `${inputId}-helper`;
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);

  const confirmed = hasConfirmedPlace(value);
  const [searchInputKey, setSearchInputKey] = useState(0);
  const [manualDraft, setManualDraft] = useState(
    () =>
      (!value.deliveryPlaceId && (value.deliveryFormattedAddress || value.addressLine)) || ''
  );
  const [showNoteHint, setShowNoteHint] = useState(false);
  const mapsLoading = hasKey && !ready && !loadError;

  useEffect(() => {
    if (confirmed || useGoogle) return;
    const manual =
      value.deliveryFormattedAddress?.trim() || value.addressLine?.trim() || '';
    setManualDraft(manual);
  }, [
    confirmed,
    useGoogle,
    value.deliveryFormattedAddress,
    value.addressLine,
    value.deliveryPlaceId,
  ]);

  const applyPlaceDetails = useCallback(
    (place: google.maps.places.PlaceResult) => {
      const lat = place.geometry?.location?.lat();
      const lng = place.geometry?.location?.lng();
      const formatted = place.formatted_address?.trim() ?? '';
      const name = place.name?.trim() ?? '';
      const placeId = place.place_id?.trim() ?? '';
      if (!placeId || !formatted || typeof lat !== 'number' || typeof lng !== 'number') {
        return;
      }

      const components = (place.address_components ?? []) as GoogleAddressComponent[];
      const parsed = parsePlacesAddressComponents(components);
      const addressLine = formatted;
      const detected = detectDistrictFromAddress(
        [formatted, parsed.province, parsed.district].filter(Boolean).join(' ')
      );
      let deliveryZoneId = value.deliveryZoneId;
      if (detected) {
        const suggested = chiangMaiZoneIdFromLegacyDistrict(
          detected,
          detected === 'MUEANG' &&
            typeof lat === 'number' &&
            typeof lng === 'number' &&
            lat >= 18.76 &&
            lat <= 18.82 &&
            lng >= 98.95 &&
            lng <= 99.02
        );
        if (suggested) deliveryZoneId = suggested;
      }

      onChange({
        ...value,
        addressLine,
        deliveryPlaceId: placeId,
        deliveryPlaceName: name || null,
        deliveryFormattedAddress: formatted,
        deliveryLat: lat,
        deliveryLng: lng,
        deliveryGoogleMapsUrl: buildDriverMapsSearchUrl(lat, lng),
        deliveryAddressComponents: components.length ? components : null,
        deliveryPostalCode: parsed.postalCode,
        deliveryProvince: parsed.province,
        deliveryDistrictLabel: parsed.district,
        deliverySubdistrict: parsed.subdistrict,
        deliveryZoneId,
        deliveryDistrict: detected ?? value.deliveryDistrict,
      });

      trackDeliveryAddressSelected({
        placeId,
        lat,
        lng,
        province: parsed.province,
      });
    },
    [onChange, value]
  );

  const fetchPlaceDetails = useCallback(
    (placeId: string) => {
      if (!placesServiceRef.current) {
        placesServiceRef.current = new google.maps.places.PlacesService(
          document.createElement('div')
        );
      }
      placesServiceRef.current.getDetails(
        {
          placeId,
          fields: [...PLACE_DETAIL_FIELDS],
        },
        (result, status) => {
          if (status === 'OK' && result) {
            applyPlaceDetails(result);
          }
        }
      );
    },
    [applyPlaceDetails]
  );

  const onPlaceChosen = useCallback(
    (place: google.maps.places.PlaceResult) => {
      const placeId = place.place_id?.trim();
      if (!placeId) return;

      const lat = place.geometry?.location?.lat();
      const lng = place.geometry?.location?.lng();
      const formatted = place.formatted_address?.trim();
      if (
        typeof lat === 'number' &&
        typeof lng === 'number' &&
        formatted
      ) {
        applyPlaceDetails(place);
        return;
      }
      fetchPlaceDetails(placeId);
    },
    [applyPlaceDetails, fetchPlaceDetails]
  );

  useEffect(() => {
    if (!useGoogle || confirmed || !inputRef.current) return;

    const Autocomplete = google.maps.places.Autocomplete;
    if (typeof Autocomplete !== 'function') return;

    const options: google.maps.places.AutocompleteOptions = {
      fields: [...PLACE_DETAIL_FIELDS],
    };
    if (restrictToThailand) {
      options.componentRestrictions = { country: 'th' };
    }
    if (biasChiangMai) {
      options.bounds = CHIANG_MAI_BOUNDS;
      options.strictBounds = false;
    }

    const autocomplete = new Autocomplete(inputRef.current, options);
    autocompleteRef.current = autocomplete;

    const listener = autocomplete.addListener('place_changed', () => {
      onPlaceChosen(autocomplete.getPlace());
    });

    return () => {
      listener.remove();
      autocompleteRef.current = null;
    };
  }, [
    useGoogle,
    confirmed,
    restrictToThailand,
    biasChiangMai,
    searchInputKey,
    onPlaceChosen,
  ]);

  const clearPlace = () => {
    onChange({
      ...value,
      addressLine: '',
      deliveryPlaceId: null,
      deliveryPlaceName: null,
      deliveryFormattedAddress: null,
      deliveryLat: null,
      deliveryLng: null,
      deliveryGoogleMapsUrl: null,
      deliveryAddressComponents: null,
      deliveryPostalCode: null,
      deliveryProvince: null,
      deliveryDistrictLabel: null,
      deliverySubdistrict: null,
    });
    setManualDraft('');
    setSearchInputKey((k) => k + 1);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const onManualChange = (text: string) => {
    const trimmed = text.slice(0, 500);
    setManualDraft(trimmed);
    onChange({
      ...value,
      addressLine: trimmed,
      deliveryFormattedAddress: trimmed || null,
      deliveryPlaceId: null,
      deliveryPlaceName: null,
      deliveryLat: null,
      deliveryLng: null,
      deliveryGoogleMapsUrl: null,
      deliveryAddressComponents: null,
      deliveryPostalCode: null,
      deliveryProvince: null,
      deliveryDistrictLabel: null,
      deliverySubdistrict: null,
    });
  };

  const onNoteChange = (note: string) => {
    onChange({ ...value, deliveryNote: note.slice(0, 300) });
    if (note.trim()) setShowNoteHint(false);
  };

  const mapPreviewUrl =
    confirmed &&
    typeof value.deliveryLat === 'number' &&
    typeof value.deliveryLng === 'number' &&
    apiKey
      ? buildStaticMapPreviewUrl(value.deliveryLat, value.deliveryLng, apiKey)
      : null;

  const showGoogleSearch = hasKey && !loadError;

  return (
    <div className={`co-address${highlight ? ' co-address--highlight' : ''}`}>
      {!confirmed && (
        <div className="co-field co-field--tight">
          <label className="co-label" htmlFor={showGoogleSearch ? inputId : `${inputId}-manual`}>
            {labels.addressLabel}
          </label>
          {showGoogleSearch ? (
            <>
              <div className="co-address-search-wrap">
                <input
                  key={searchInputKey}
                  ref={inputRef}
                  id={inputId}
                  type="text"
                  className="co-input co-input--large"
                  placeholder={labels.searchPlaceholder}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  aria-label={labels.addressLabel}
                  aria-describedby={helperId}
                  aria-busy={mapsLoading || undefined}
                />
              </div>
              <p id={helperId} className="co-address-helper">
                {mapsLoading ? 'Loading address search… ' : null}
                {labels.helperText}
              </p>
            </>
          ) : (
            <>
              {!hasKey && (
                <p className="co-address-helper co-address-status co-address-status--warn">
                  Add <code>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> to <code>.env.local</code>{' '}
                  and restart the dev server for address search. You can still type your address
                  below.
                </p>
              )}
              {loadError && hasKey && (
                <p className="co-address-helper co-address-status co-address-status--warn">
                  Google Maps could not load — enter your full address below.
                </p>
              )}
              <textarea
                id={`${inputId}-manual`}
                className="co-input co-textarea"
                value={manualDraft}
                onChange={(e) => onManualChange(e.target.value)}
                placeholder={labels.manualPlaceholder}
                rows={3}
                maxLength={500}
                aria-label={labels.manualLabel}
              />
            </>
          )}
        </div>
      )}

      {confirmed && (
        <div className="co-address-confirmed">
          <div className="co-address-card">
            <div className="co-address-card-body">
              {value.deliveryPlaceName && (
                <strong className="co-address-card-name">{value.deliveryPlaceName}</strong>
              )}
              <span className="co-address-card-line">{value.deliveryFormattedAddress}</span>
            </div>
            <button type="button" className="co-text-btn" onClick={clearPlace}>
              {labels.confirmedChange}
            </button>
          </div>

          {mapPreviewUrl && (
            <div className="co-address-map-wrap">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={mapPreviewUrl}
                alt=""
                className="co-address-map"
                width={600}
                height={160}
                loading="lazy"
                decoding="async"
              />
            </div>
          )}

          <div className="co-field co-field--tight">
            <label className="co-label" htmlFor={`${inputId}-note`}>
              {labels.deliveryNoteLabel}
            </label>
            <input
              id={`${inputId}-note`}
              type="text"
              className="co-input"
              value={value.deliveryNote ?? ''}
              onChange={(e) => onNoteChange(e.target.value)}
              onBlur={() => {
                if (!value.deliveryNote?.trim()) setShowNoteHint(true);
              }}
              placeholder={labels.deliveryNotePlaceholder}
              maxLength={300}
              autoComplete="off"
            />
            {showNoteHint && !value.deliveryNote?.trim() && (
              <p className="co-address-note-hint">{labels.deliveryNoteHint}</p>
            )}
          </div>
        </div>
      )}

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
        .co-address-search-wrap {
          position: relative;
          overflow: visible;
          z-index: 20;
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
          transition:
            border-color 0.2s ease,
            box-shadow 0.2s ease;
          -webkit-appearance: none;
          appearance: none;
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
          min-height: 88px;
          font-size: 16px;
          line-height: 1.45;
        }
        .co-address-helper,
        .co-address-note-hint {
          margin: 0;
          font-size: 13px;
          line-height: 1.45;
          color: var(--text-muted);
        }
        .co-address-note-hint {
          color: color-mix(in srgb, var(--accent) 70%, var(--text-muted));
        }
        .co-address-status {
          font-size: 12px;
        }
        .co-address-status--warn {
          color: color-mix(in srgb, var(--accent) 55%, var(--text-muted));
        }
        .co-address-status code {
          font-size: 11px;
        }
        .co-address-confirmed {
          display: flex;
          flex-direction: column;
          gap: 12px;
          animation: co-address-in 0.28s ease-out;
        }
        @keyframes co-address-in {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
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
        .co-address-map-wrap {
          border-radius: 12px;
          overflow: hidden;
          border: 1px solid color-mix(in srgb, var(--primary) 10%, var(--border));
          line-height: 0;
        }
        .co-address-map {
          width: 100%;
          height: auto;
          display: block;
          object-fit: cover;
          max-height: 140px;
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
          touch-action: manipulation;
        }
      `}</style>
    </div>
  );
}
