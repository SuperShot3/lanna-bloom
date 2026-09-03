'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { CHECKOUT_FIELD_LIMITS, clipCheckoutField } from '@/lib/checkout/checkoutFieldLimits';
import { buildDriverMapsSearchUrl } from '@/lib/google/buildDriverMapsUrl';
import {
  buildDestinationMapsUrl,
  mapCenterForDestination,
} from '@/lib/google/destinationMapCenters';
import { getGoogleMapsApiKey, loadGoogleMapsScript } from '@/lib/google/loadGoogleMapsScript';
import { parseDeliveryLocationInput } from '@/lib/google/parseDeliveryLocationInput';

export interface DeliveryLocationValue {
  lat: number | null;
  lng: number | null;
  googleMapsUrl: string;
}

const ZOOM = 13;

export function buildGoogleMapsUrl(lat: number, lng: number): string {
  return buildDriverMapsSearchUrl(lat, lng);
}

export function locationHasCoords(
  v: DeliveryLocationValue | null
): v is DeliveryLocationValue & { lat: number; lng: number } {
  return (
    v != null &&
    typeof v.lat === 'number' &&
    Number.isFinite(v.lat) &&
    typeof v.lng === 'number' &&
    Number.isFinite(v.lng)
  );
}

type GoogleLatLng = { lat: () => number; lng: () => number };

type GoogleMapsListener = { remove: () => void };

type GoogleMap = {
  panTo: (c: { lat: number; lng: number }) => void;
  getZoom: () => number | undefined;
  setZoom: (zoom: number) => void;
  addListener: (
    name: string,
    fn: (e: { latLng?: GoogleLatLng | null }) => void
  ) => GoogleMapsListener;
};

type GoogleMarker = {
  setPosition: (c: { lat: number; lng: number }) => void;
  getPosition: () => GoogleLatLng | null;
  setMap: (map: GoogleMap | null) => void;
  addListener: (name: string, fn: () => void) => GoogleMapsListener;
};

type GoogleMapsApi = {
  Map: new (
    el: HTMLElement,
    opts: {
      center: { lat: number; lng: number };
      zoom: number;
      gestureHandling: string;
      mapTypeControl: boolean;
      streetViewControl: boolean;
      fullscreenControl: boolean;
      zoomControl: boolean;
      disableDoubleClickZoom: boolean;
    }
  ) => GoogleMap;
  Marker: new (opts: {
    map: GoogleMap;
    position: { lat: number; lng: number };
    draggable: boolean;
  }) => GoogleMarker;
};

function getGoogleMapsApi(): GoogleMapsApi | null {
  const maps = (window as Window & { google?: { maps?: GoogleMapsApi } }).google?.maps;
  return maps?.Map && maps?.Marker ? maps : null;
}

function toPin(lat: number, lng: number, googleMapsUrl?: string): DeliveryLocationValue {
  return {
    lat,
    lng,
    googleMapsUrl: googleMapsUrl || buildDriverMapsSearchUrl(lat, lng),
  };
}

function displayTextForLocation(v: DeliveryLocationValue | null): string {
  if (!v) return '';
  if (locationHasCoords(v)) return `${v.lat}, ${v.lng}`;
  return v.googleMapsUrl;
}

export function DeliveryLocationPicker({
  value,
  onChange,
  destinationId,
  highlight = false,
  mapElementId = 'checkout-delivery-address-map',
  dropPinPrompt = 'Double-click the map to drop a pin.',
  selectedLocationLabel: _selectedLocationLabel = 'Selected:',
  openInGoogleMapsLabel = 'Open in Google Maps',
  mapUnavailableLabel = 'The map could not load. You can still continue with your address.',
  confirmPinQuestion = 'Use this pin?',
  confirmPinYes = 'Yes',
  confirmPinNo = 'No',
  pinConfirmedLabel = 'Pin confirmed',
  locationSavedLabel = 'Location saved',
  editPinLabel = 'Edit',
  removePinLabel = 'Remove',
  zoomInLabel = 'Zoom in',
  zoomOutLabel = 'Zoom out',
  pastePlaceholder = 'Paste a Google Maps link or latitude, longitude',
  pasteInvalidLabel = 'Paste a Google Maps link or coordinates (for example 18.7883, 98.9853).',
}: {
  value: DeliveryLocationValue | null;
  onChange: (v: DeliveryLocationValue | null) => void;
  destinationId?: string | null;
  highlight?: boolean;
  mapElementId?: string;
  dropPinPrompt?: string;
  selectedLocationLabel?: string;
  openInGoogleMapsLabel?: string;
  mapUnavailableLabel?: string;
  confirmPinQuestion?: string;
  confirmPinYes?: string;
  confirmPinNo?: string;
  pinConfirmedLabel?: string;
  locationSavedLabel?: string;
  editPinLabel?: string;
  removePinLabel?: string;
  zoomInLabel?: string;
  zoomOutLabel?: string;
  pastePlaceholder?: string;
  pasteInvalidLabel?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<GoogleMap | null>(null);
  const markerRef = useRef<GoogleMarker | null>(null);
  const listenersRef = useRef<GoogleMapsListener[]>([]);
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  const destinationIdRef = useRef(destinationId);
  const draftRef = useRef<DeliveryLocationValue | null>(null);
  const pasteFocusedRef = useRef(false);
  valueRef.current = value;
  onChangeRef.current = onChange;
  destinationIdRef.current = destinationId;

  const [mounted, setMounted] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<DeliveryLocationValue | null>(null);
  const [pasteText, setPasteText] = useState(() => displayTextForLocation(value));
  const [pasteError, setPasteError] = useState(false);
  draftRef.current = draft;
  const apiKey = getGoogleMapsApiKey();

  const confirmed = value != null && !editing;
  const mapOpen = mounted && !unavailable && !confirmed;
  const showEditor = !confirmed;
  const shownPin = draft ?? value;

  const openMapsHref =
    shownPin?.googleMapsUrl ||
    value?.googleMapsUrl ||
    buildDestinationMapsUrl(destinationId, ZOOM);

  const clearMarker = useCallback(() => {
    if (markerRef.current) {
      try {
        markerRef.current.setMap(null);
      } catch {
        // ignore
      }
      markerRef.current = null;
    }
  }, []);

  const syncMarker = useCallback((maps: GoogleMapsApi, map: GoogleMap, lat: number, lng: number) => {
    const position = { lat, lng };
    if (markerRef.current) {
      markerRef.current.setPosition(position);
      return;
    }
    const marker = new maps.Marker({
      map,
      position,
      draggable: true,
    });
    const dragListener = marker.addListener('dragend', () => {
      const pos = marker.getPosition();
      if (!pos) return;
      setDraft(toPin(pos.lat(), pos.lng()));
    });
    listenersRef.current.push(dragListener);
    markerRef.current = marker;
  }, []);

  const placeDraft = useCallback(
    (lat: number, lng: number, googleMapsUrl?: string) => {
      const maps = getGoogleMapsApi();
      const map = mapRef.current;
      if (maps && map) syncMarker(maps, map, lat, lng);
      setDraft(toPin(lat, lng, googleMapsUrl));
    },
    [syncMarker]
  );

  const applyPaste = useCallback(
    (raw: string) => {
      const trimmed = raw.trim();
      if (!trimmed) {
        setPasteError(false);
        return;
      }
      const parsed = parseDeliveryLocationInput(trimmed);
      if (parsed.kind === 'invalid') {
        setPasteError(true);
        return;
      }
      if (parsed.kind === 'mapsUrl' && parsed.url.length > CHECKOUT_FIELD_LIMITS.googleMapsUrl) {
        setPasteError(true);
        return;
      }
      setPasteError(false);

      if (parsed.kind === 'coords') {
        if (unavailable) {
          onChangeRef.current(toPin(parsed.lat, parsed.lng));
          setDraft(null);
          setEditing(false);
          return;
        }
        placeDraft(parsed.lat, parsed.lng);
        return;
      }

      if (parsed.lat != null && parsed.lng != null) {
        if (unavailable) {
          onChangeRef.current(toPin(parsed.lat, parsed.lng, parsed.url));
          setDraft(null);
          setEditing(false);
          return;
        }
        placeDraft(parsed.lat, parsed.lng, parsed.url);
        return;
      }

      onChangeRef.current({ lat: null, lng: null, googleMapsUrl: parsed.url });
      setDraft(null);
      setEditing(false);
    },
    [placeDraft, unavailable]
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (highlight && value) setEditing(true);
  }, [highlight, value]);

  useEffect(() => {
    if (confirmed) {
      pasteFocusedRef.current = false;
      setPasteError(false);
    }
    if (pasteFocusedRef.current) return;
    setPasteText(displayTextForLocation(draft ?? value));
  }, [draft, value, confirmed]);

  useEffect(() => {
    if (!mapOpen) return;
    if (!apiKey) {
      setUnavailable(true);
      return;
    }

    let cancelled = false;

    const init = async () => {
      try {
        await loadGoogleMapsScript(apiKey);
        if (cancelled || !containerRef.current) return;
        const maps = getGoogleMapsApi();
        if (!maps) {
          setUnavailable(true);
          return;
        }

        const current = draftRef.current ?? valueRef.current;
        const center = locationHasCoords(current)
          ? { lat: current.lat, lng: current.lng }
          : mapCenterForDestination(destinationIdRef.current);
        const map = new maps.Map(containerRef.current, {
          center,
          zoom: ZOOM,
          gestureHandling: 'cooperative',
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          zoomControl: false,
          disableDoubleClickZoom: true,
        });
        mapRef.current = map;

        const dblClickListener = map.addListener('dblclick', (e) => {
          const latLng = e.latLng;
          if (!latLng) return;
          placeDraft(latLng.lat(), latLng.lng());
        });
        listenersRef.current.push(dblClickListener);

        if (locationHasCoords(current)) {
          syncMarker(maps, map, current.lat, current.lng);
        }
      } catch {
        if (!cancelled) setUnavailable(true);
      }
    };

    void init();

    return () => {
      cancelled = true;
      listenersRef.current.forEach((l) => {
        try {
          l.remove();
        } catch {
          // ignore
        }
      });
      listenersRef.current = [];
      markerRef.current = null;
      mapRef.current = null;
    };
  }, [mapOpen, apiKey, placeDraft, syncMarker]);

  useEffect(() => {
    const map = mapRef.current;
    const maps = typeof window !== 'undefined' ? getGoogleMapsApi() : null;
    if (!map || !maps || !mapOpen) return;
    const shown = draft ?? value;
    if (locationHasCoords(shown)) {
      syncMarker(maps, map, shown.lat, shown.lng);
      map.panTo({ lat: shown.lat, lng: shown.lng });
      return;
    }
    clearMarker();
    map.panTo(mapCenterForDestination(destinationId));
  }, [draft, value, destinationId, syncMarker, clearMarker, mapOpen]);

  const adjustZoom = (delta: number) => {
    const map = mapRef.current;
    if (!map) return;
    const current = map.getZoom() ?? ZOOM;
    map.setZoom(Math.min(21, Math.max(3, current + delta)));
  };

  const handleConfirmYes = () => {
    const pin = draft ?? value;
    if (!pin) return;
    onChange(pin);
    setDraft(null);
    setEditing(false);
  };

  const handleConfirmNo = () => {
    setDraft(null);
    if (value) {
      setEditing(false);
      return;
    }
    clearMarker();
  };

  const handleEdit = () => {
    setDraft(value);
    setEditing(true);
  };

  const handleRemove = () => {
    onChange(null);
    setDraft(null);
    setEditing(false);
    setPasteText('');
    setPasteError(false);
    clearMarker();
  };

  const pasteId = `${mapElementId}-paste`;
  const pasteErrorId = `${mapElementId}-paste-error`;
  const showConfirm = mapOpen && locationHasCoords(shownPin);

  return (
    <div
      id={mapElementId}
      className={`delivery-location-picker${highlight ? ' delivery-location-picker--highlight' : ''}`}
    >
      {confirmed && value ? (
        <div className="delivery-location-confirmed" aria-live="polite">
          <span className="delivery-location-check" aria-hidden>
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="10" r="10" fill="#16a34a" />
              <path
                d="M6 10.2 8.6 12.8 14.2 7.2"
                stroke="#fff"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <p className="delivery-location-confirmed-label">
            {locationHasCoords(value) ? pinConfirmedLabel : locationSavedLabel}
          </p>
          <a
            href={value.googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="delivery-location-gmaps-btn"
          >
            {openInGoogleMapsLabel}
          </a>
          <button type="button" className="delivery-location-mini-btn" onClick={handleEdit}>
            {editPinLabel}
          </button>
          <button
            type="button"
            className="delivery-location-mini-btn delivery-location-mini-btn--remove"
            onClick={handleRemove}
          >
            {removePinLabel}
          </button>
        </div>
      ) : null}

      {showEditor ? (
        <div className="delivery-location-toolbar">
          <a
            href={openMapsHref}
            target="_blank"
            rel="noopener noreferrer"
            className="delivery-location-gmaps-btn"
          >
            {openInGoogleMapsLabel}
          </a>
        </div>
      ) : null}

      {mapOpen ? (
        <>
          <div className="delivery-location-map-frame">
            <div
              className="delivery-location-map-wrap"
              ref={containerRef}
              role="application"
              aria-label={dropPinPrompt}
              style={{ minHeight: 280, width: '100%' }}
            />
            <div className="delivery-location-zoom" role="group" aria-label="Map zoom">
              <button type="button" className="delivery-location-zoom-btn" onClick={() => adjustZoom(1)} aria-label={zoomInLabel}>
                +
              </button>
              <button type="button" className="delivery-location-zoom-btn" onClick={() => adjustZoom(-1)} aria-label={zoomOutLabel}>
                −
              </button>
            </div>
            {showConfirm ? (
              <div className="delivery-location-confirm" role="dialog" aria-label={confirmPinQuestion}>
                <span className="delivery-location-confirm-icon" aria-hidden>
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M8 1.6c-2.5 0-4.5 1.9-4.5 4.3 0 3.2 4.5 8.5 4.5 8.5s4.5-5.3 4.5-8.5C12.5 3.5 10.5 1.6 8 1.6Z"
                      stroke="currentColor"
                      strokeWidth="1.4"
                    />
                    <circle cx="8" cy="6" r="1.4" fill="currentColor" />
                  </svg>
                </span>
                <p className="delivery-location-confirm-q">{confirmPinQuestion}</p>
                <button type="button" className="delivery-location-confirm-yes" onClick={handleConfirmYes}>
                  {confirmPinYes}
                </button>
                <button type="button" className="delivery-location-confirm-no" onClick={handleConfirmNo}>
                  {confirmPinNo}
                </button>
              </div>
            ) : null}
          </div>
          <p className="delivery-location-readout" aria-live="polite">
            {dropPinPrompt}
          </p>
        </>
      ) : null}

      {unavailable ? (
        <p className="delivery-location-readout" aria-live="polite">
          {mapUnavailableLabel}
        </p>
      ) : null}

      {showEditor ? (
        <div className="delivery-location-paste">
          <label htmlFor={pasteId} className="visually-hidden">
            {pastePlaceholder}
          </label>
          <input
            id={pasteId}
            type="text"
            className="delivery-location-paste-input"
            value={pasteText}
            placeholder={pastePlaceholder}
            maxLength={CHECKOUT_FIELD_LIMITS.googleMapsUrl}
            autoComplete="off"
            aria-invalid={pasteError}
            aria-describedby={pasteError ? pasteErrorId : undefined}
            onChange={(e) => {
              const next = clipCheckoutField(e.target.value, 'googleMapsUrl');
              setPasteText(next);
              if (pasteError) setPasteError(false);
            }}
            onFocus={() => {
              pasteFocusedRef.current = true;
            }}
            onBlur={() => {
              pasteFocusedRef.current = false;
              applyPaste(pasteText);
            }}
            onKeyDown={(e) => {
              if (e.key !== 'Enter') return;
              e.preventDefault();
              applyPaste(pasteText);
            }}
            onPaste={(e) => {
              const text = e.clipboardData.getData('text');
              if (!text.trim()) return;
              e.preventDefault();
              const clipped = clipCheckoutField(text, 'googleMapsUrl');
              setPasteText(clipped);
              queueMicrotask(() => applyPaste(clipped));
            }}
          />
          {pasteError ? (
            <p id={pasteErrorId} className="delivery-location-paste-error" role="alert">
              {pasteInvalidLabel}
            </p>
          ) : null}
        </div>
      ) : null}

      <style jsx>{`
        .delivery-location-picker {
          margin-top: 0;
          border: 1px solid var(--border);
          border-radius: 14px;
          background: var(--surface);
          overflow: hidden;
        }
        .delivery-location-map-frame {
          position: relative;
        }
        .delivery-location-map-wrap {
          height: 280px;
          width: 100%;
          border: none;
          overflow: hidden;
          background: var(--pastel-cream);
        }
        .delivery-location-picker--highlight .delivery-location-map-wrap,
        .delivery-location-picker--highlight {
          border-color: color-mix(in srgb, var(--accent) 55%, var(--border));
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent-soft) 65%, transparent);
        }
        .delivery-location-picker:has(.delivery-location-confirmed) {
          border-color: color-mix(in srgb, #16a34a 38%, var(--border));
        }
        @media (min-width: 768px) {
          .delivery-location-map-wrap {
            height: 360px;
          }
        }
        .delivery-location-toolbar {
          display: flex;
          justify-content: flex-end;
          padding: 8px 10px;
          border-bottom: 1px solid var(--border);
          background: var(--surface);
        }
        .delivery-location-zoom {
          position: absolute;
          top: 12px;
          right: 12px;
          z-index: 2;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          border-radius: 10px;
          border: 1px solid var(--border);
          box-shadow: 0 4px 14px rgba(45, 42, 38, 0.12);
          background: var(--surface);
        }
        .delivery-location-zoom-btn {
          width: 40px;
          height: 40px;
          border: none;
          background: var(--surface);
          color: var(--text);
          font-size: 1.35rem;
          font-weight: 600;
          line-height: 1;
          cursor: pointer;
        }
        .delivery-location-zoom-btn + .delivery-location-zoom-btn {
          border-top: 1px solid var(--border);
        }
        .delivery-location-zoom-btn:hover,
        .delivery-location-zoom-btn:focus-visible {
          background: var(--pastel-cream);
          outline: none;
        }
        .delivery-location-confirm {
          position: absolute;
          left: 50%;
          bottom: 12px;
          z-index: 2;
          display: flex;
          align-items: center;
          gap: 8px;
          width: max-content;
          max-width: calc(100% - 24px);
          transform: translateX(-50%);
          padding: 5px 6px 5px 10px;
          border-radius: 999px;
          background: color-mix(in srgb, var(--surface) 88%, transparent);
          border: 1px solid color-mix(in srgb, var(--border) 80%, rgba(255, 255, 255, 0.7));
          box-shadow:
            0 1px 0 rgba(255, 255, 255, 0.55) inset,
            0 8px 22px rgba(45, 42, 38, 0.16);
          backdrop-filter: blur(10px);
        }
        .delivery-location-confirm-icon {
          flex-shrink: 0;
          display: flex;
          color: var(--accent);
        }
        .delivery-location-confirm-q {
          margin: 0;
          font-size: 0.78rem;
          font-weight: 600;
          letter-spacing: 0.01em;
          color: var(--text);
          white-space: nowrap;
        }
        .delivery-location-confirm-yes,
        .delivery-location-confirm-no {
          min-height: 28px;
          padding: 0 11px;
          border-radius: 999px;
          font-size: 0.75rem;
          font-weight: 600;
          font-family: inherit;
          cursor: pointer;
          white-space: nowrap;
        }
        .delivery-location-confirm-yes {
          border: none;
          background: var(--primary);
          color: var(--primary-foreground);
        }
        .delivery-location-confirm-yes:hover,
        .delivery-location-confirm-yes:focus-visible {
          filter: brightness(1.05);
          outline: none;
        }
        .delivery-location-confirm-no {
          border: 1px solid var(--border);
          background: transparent;
          color: var(--text-muted);
        }
        .delivery-location-confirm-no:hover,
        .delivery-location-confirm-no:focus-visible {
          background: var(--pastel-cream);
          color: var(--text);
          outline: none;
        }
        .delivery-location-readout {
          font-size: 0.8rem;
          color: var(--text-muted);
          margin: 0;
          padding: 8px 12px 10px;
          line-height: 1.4;
        }
        .delivery-location-paste {
          padding: 0 10px 10px;
        }
        .delivery-location-paste-input {
          width: 100%;
          min-height: 44px;
          padding: 10px 12px;
          border: 1px solid var(--border);
          border-radius: 10px;
          font-size: 16px;
          font-family: inherit;
          color: var(--text);
          background: var(--surface);
          box-sizing: border-box;
        }
        .delivery-location-paste-input:focus {
          outline: none;
          border-color: color-mix(in srgb, var(--accent) 45%, var(--border));
        }
        .delivery-location-paste-input[aria-invalid='true'] {
          border-color: #b91c1c;
        }
        .delivery-location-paste-error {
          margin: 6px 2px 0;
          font-size: 0.78rem;
          line-height: 1.4;
          color: #b91c1c;
        }
        .visually-hidden {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
        }
        .delivery-location-confirmed {
          display: flex;
          align-items: center;
          gap: 6px;
          min-height: 44px;
          padding: 6px 8px 6px 10px;
          background: color-mix(in srgb, #16a34a 10%, var(--surface));
          flex-wrap: nowrap;
        }
        .delivery-location-check {
          flex-shrink: 0;
          display: flex;
        }
        .delivery-location-confirmed-label {
          flex: 1;
          min-width: 0;
          font-size: 0.8rem;
          font-weight: 600;
          color: #166534;
          margin: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .delivery-location-mini-btn {
          flex-shrink: 0;
          min-height: 30px;
          padding: 0 8px;
          border-radius: 8px;
          border: 1px solid var(--border);
          background: var(--surface);
          color: var(--text);
          font-size: 0.75rem;
          font-weight: 600;
          font-family: inherit;
          cursor: pointer;
          white-space: nowrap;
        }
        .delivery-location-mini-btn--remove {
          color: #b91c1c;
        }
        .delivery-location-gmaps-btn {
          flex-shrink: 0;
          margin-left: auto;
          display: inline-flex;
          align-items: center;
          padding: 0 8px;
          min-height: 30px;
          font-size: 0.72rem;
          font-weight: 600;
          color: #fff;
          background: var(--accent);
          border-radius: 8px;
          text-decoration: none;
          white-space: nowrap;
        }
        .delivery-location-gmaps-btn:hover {
          background: #a88b5c;
        }
      `}</style>
    </div>
  );
}
