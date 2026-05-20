'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
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
} from '@/lib/google/placesAddressComponents';
import {
  newAddressComponentsToLegacy,
  readPlaceDisplayName,
  readPlaceLatLng,
} from '@/lib/google/readPlaceFields';
import { trackDeliveryAddressSelected } from '@/lib/analytics/gtag';
import { useGooglePlacesScript } from '@/hooks/useGooglePlacesScript';

const GOOGLE_MAPS_OPEN_URL = 'https://www.google.com/maps';
const MAPS_LINK_MAX_LEN = 2000;

const PLACE_FETCH_FIELDS = [
  'id',
  'displayName',
  'formattedAddress',
  'location',
  'addressComponents',
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
    googleMapsLinkPlaceholder: string;
    googleMapsLinkHint: string;
    openGoogleMapsAriaLabel: string;
  };
}) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ?? '';
  const { ready, hasKey, loadError } = useGooglePlacesScript();
  const useGoogle = hasKey && ready && !loadError;

  const helperId = `${inputId}-helper`;
  const autocompleteHostRef = useRef<HTMLDivElement>(null);
  const [placesWidgetError, setPlacesWidgetError] = useState(false);

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

  const applySelectedPlace = useCallback(
    (place: google.maps.places.Place) => {
      const coords = readPlaceLatLng(place.location);
      const formatted = place.formattedAddress?.trim() ?? '';
      const name = readPlaceDisplayName(place.displayName);
      const placeId = place.id?.trim() ?? '';
      if (!placeId || !formatted || !coords) {
        return;
      }
      const { lat, lng } = coords;

      const components = newAddressComponentsToLegacy(place.addressComponents);
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

  useEffect(() => {
    if (!useGoogle || confirmed || !autocompleteHostRef.current) return;

    const host = autocompleteHostRef.current;
    let cancelled = false;
    setPlacesWidgetError(false);
    host.replaceChildren();

    const mountWidget = async () => {
      try {
        await google.maps.importLibrary('places');
        if (cancelled) return;

        const PlaceAutocompleteElement = google.maps.places.PlaceAutocompleteElement;
        if (typeof PlaceAutocompleteElement !== 'function') {
          setPlacesWidgetError(true);
          return;
        }

        const options: google.maps.places.PlaceAutocompleteElementOptions = {
          placeholder: labels.searchPlaceholder,
        };
        if (restrictToThailand) {
          options.includedRegionCodes = ['th'];
        }
        if (biasChiangMai) {
          options.locationBias = CHIANG_MAI_BOUNDS;
        }

        const widget = new PlaceAutocompleteElement(options);
        widget.id = inputId;
        widget.className = 'co-place-autocomplete';

        const onSelect = async (event: google.maps.places.PlacePredictionSelectEvent) => {
          try {
            const place = event.placePrediction.toPlace();
            await place.fetchFields({ fields: [...PLACE_FETCH_FIELDS] });
            if (!cancelled) applySelectedPlace(place);
          } catch {
            /* selection fetch failed — user can retry or use manual entry */
          }
        };

        const onWidgetError = () => {
          if (!cancelled) setPlacesWidgetError(true);
        };

        widget.addEventListener('gmp-select', onSelect);
        widget.addEventListener('gmp-error', onWidgetError);

        if (!cancelled) host.appendChild(widget);
      } catch {
        if (!cancelled) setPlacesWidgetError(true);
      }
    };

    void mountWidget();

    return () => {
      cancelled = true;
      host.replaceChildren();
    };
  }, [
    useGoogle,
    confirmed,
    restrictToThailand,
    biasChiangMai,
    searchInputKey,
    inputId,
    labels.searchPlaceholder,
    applySelectedPlace,
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
    requestAnimationFrame(() => {
      const input = autocompleteHostRef.current?.querySelector('input');
      if (input instanceof HTMLInputElement) input.focus();
    });
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
      deliveryAddressComponents: null,
      deliveryPostalCode: null,
      deliveryProvince: null,
      deliveryDistrictLabel: null,
      deliverySubdistrict: null,
    });
  };

  const onMapsLinkChange = (url: string) => {
    const trimmed = url.trim().slice(0, MAPS_LINK_MAX_LEN);
    onChange({
      ...value,
      deliveryGoogleMapsUrl: trimmed || null,
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

  const showGoogleSearch = hasKey && !loadError && !placesWidgetError;

  return (
    <div className={`co-address${highlight ? ' co-address--highlight' : ''}`}>
      {!confirmed && (
        <div className="co-field co-field--tight">
          <label className="co-label" htmlFor={showGoogleSearch ? inputId : `${inputId}-manual`}>
            {labels.addressLabel}
          </label>
          {showGoogleSearch ? (
            <>
              <div
                key={searchInputKey}
                ref={autocompleteHostRef}
                className="co-address-search-wrap"
                aria-busy={mapsLoading || undefined}
                aria-describedby={helperId}
              />
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
              {(loadError || placesWidgetError) && hasKey && (
                <p className="co-address-helper co-address-status co-address-status--warn">
                  Google address search is unavailable — enter your full address below. Enable{' '}
                  <strong>Places API (New)</strong> in Google Cloud for this API key.
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
        </div>
      )}

      <div className="co-field co-field--tight">
        <div className="co-maps-link-row">
          <input
            id={`${inputId}-maps-link`}
            type="url"
            inputMode="url"
            className="co-input co-maps-link-input"
            value={value.deliveryGoogleMapsUrl ?? ''}
            onChange={(e) => onMapsLinkChange(e.target.value)}
            placeholder={labels.googleMapsLinkPlaceholder}
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
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

      {confirmed && (
        <div className="co-address-confirmed-notes">
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
        .co-address-search-wrap :global(.co-place-autocomplete) {
          width: 100%;
          display: block;
          border-radius: 14px;
          font-size: 16px;
          font-family: inherit;
          --gmp-mat-color-surface: #fff;
          --gmp-mat-color-on-surface: var(--text);
          --gmp-mat-font-family: inherit;
          --gmp-mat-font-body-medium: 16px var(--font-sans, inherit);
        }
        .co-address-search-wrap :global(.co-place-autocomplete:focus-within) {
          outline: none;
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent-soft) 65%, transparent);
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
        .co-address-confirmed-notes {
          display: flex;
          flex-direction: column;
          gap: 12px;
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
