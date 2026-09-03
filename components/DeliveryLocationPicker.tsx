'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { buildDriverMapsSearchUrl } from '@/lib/google/buildDriverMapsUrl';
import { mapCenterForDestination } from '@/lib/google/destinationMapCenters';
import { getGoogleMapsApiKey, loadGoogleMapsScript } from '@/lib/google/loadGoogleMapsScript';

export interface DeliveryLocationValue {
  lat: number;
  lng: number;
  googleMapsUrl: string;
}

const ZOOM = 13;

export function buildGoogleMapsUrl(lat: number, lng: number): string {
  return buildDriverMapsSearchUrl(lat, lng);
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

function toPin(lat: number, lng: number): DeliveryLocationValue {
  return {
    lat,
    lng,
    googleMapsUrl: buildDriverMapsSearchUrl(lat, lng),
  };
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
  editPinLabel = 'Edit',
  removePinLabel = 'Remove',
  zoomInLabel = 'Zoom in',
  zoomOutLabel = 'Zoom out',
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
  editPinLabel?: string;
  removePinLabel?: string;
  zoomInLabel?: string;
  zoomOutLabel?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<GoogleMap | null>(null);
  const markerRef = useRef<GoogleMarker | null>(null);
  const listenersRef = useRef<GoogleMapsListener[]>([]);
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  const destinationIdRef = useRef(destinationId);
  const draftRef = useRef<DeliveryLocationValue | null>(null);
  valueRef.current = value;
  onChangeRef.current = onChange;
  destinationIdRef.current = destinationId;

  const [mounted, setMounted] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<DeliveryLocationValue | null>(null);
  draftRef.current = draft;
  const apiKey = getGoogleMapsApiKey();

  const confirmed = value != null && !editing;
  const mapOpen = mounted && !unavailable && !confirmed;

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
    (lat: number, lng: number) => {
      const maps = getGoogleMapsApi();
      const map = mapRef.current;
      if (maps && map) syncMarker(maps, map, lat, lng);
      setDraft(toPin(lat, lng));
    },
    [syncMarker]
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (highlight && value) setEditing(true);
  }, [highlight, value]);

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
        const center = current
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

        if (current) {
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
    if (shown) {
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
    clearMarker();
  };

  const shownPin = draft ?? value;

  return (
    <div
      id={mapElementId}
      className={`delivery-location-picker${highlight ? ' delivery-location-picker--highlight' : ''}`}
    >
      {confirmed && value ? (
        <div className="delivery-location-confirmed" aria-live="polite">
          <div className="delivery-location-confirmed-top">
            <span className="delivery-location-check" aria-hidden>
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
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
            <div className="delivery-location-confirmed-copy">
              <p className="delivery-location-confirmed-label">{pinConfirmedLabel}</p>
              <p className="delivery-location-card-coords">
                {value.lat.toFixed(5)}, {value.lng.toFixed(5)}
              </p>
            </div>
            <a
              href={value.googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="delivery-location-gmaps-btn"
            >
              {openInGoogleMapsLabel}
            </a>
          </div>
          <div className="delivery-location-confirmed-actions">
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
            {shownPin ? (
              <div className="delivery-location-confirm" role="dialog" aria-label={confirmPinQuestion}>
                <p className="delivery-location-confirm-q">{confirmPinQuestion}</p>
                <div className="delivery-location-confirm-row">
                  <button type="button" className="delivery-location-confirm-yes" onClick={handleConfirmYes}>
                    {confirmPinYes}
                  </button>
                  <button type="button" className="delivery-location-confirm-no" onClick={handleConfirmNo}>
                    {confirmPinNo}
                  </button>
                  <a
                    href={shownPin.googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="delivery-location-gmaps-btn delivery-location-gmaps-btn--inline"
                  >
                    {openInGoogleMapsLabel}
                  </a>
                </div>
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

      <style jsx>{`
        .delivery-location-picker {
          margin-top: 0;
        }
        .delivery-location-map-frame {
          position: relative;
        }
        .delivery-location-map-wrap {
          height: 280px;
          width: 100%;
          border-radius: 14px;
          border: 1px solid var(--border);
          overflow: hidden;
          background: var(--pastel-cream);
        }
        .delivery-location-picker--highlight .delivery-location-map-wrap,
        .delivery-location-picker--highlight .delivery-location-confirmed {
          border-color: color-mix(in srgb, var(--accent) 55%, var(--border));
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent-soft) 65%, transparent);
        }
        @media (min-width: 768px) {
          .delivery-location-map-wrap {
            height: 360px;
          }
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
          left: 10px;
          right: 10px;
          bottom: 10px;
          z-index: 2;
          padding: 12px 14px;
          border-radius: 12px;
          background: color-mix(in srgb, var(--surface) 94%, transparent);
          border: 1px solid var(--border);
          box-shadow: 0 8px 24px rgba(45, 42, 38, 0.16);
          backdrop-filter: blur(8px);
        }
        .delivery-location-confirm-q {
          margin: 0 0 10px;
          font-size: 0.9rem;
          font-weight: 600;
          color: var(--text);
        }
        .delivery-location-confirm-row {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        .delivery-location-confirm-yes,
        .delivery-location-confirm-no {
          min-height: 36px;
          padding: 0 14px;
          border-radius: 10px;
          font-size: 0.85rem;
          font-weight: 600;
          font-family: inherit;
          cursor: pointer;
        }
        .delivery-location-confirm-yes {
          border: none;
          background: #16a34a;
          color: #fff;
        }
        .delivery-location-confirm-no {
          border: 1px solid var(--border);
          background: var(--surface);
          color: var(--text);
        }
        .delivery-location-readout {
          font-size: 0.85rem;
          color: var(--text-muted);
          margin: 10px 0 0;
          line-height: 1.45;
        }
        .delivery-location-confirmed {
          padding: 14px 16px;
          background: color-mix(in srgb, #16a34a 10%, var(--surface));
          border: 1px solid color-mix(in srgb, #16a34a 38%, var(--border));
          border-radius: 14px;
        }
        .delivery-location-confirmed-top {
          display: flex;
          align-items: flex-start;
          gap: 10px;
        }
        .delivery-location-check {
          flex-shrink: 0;
          margin-top: 1px;
        }
        .delivery-location-confirmed-copy {
          flex: 1;
          min-width: 0;
        }
        .delivery-location-confirmed-label {
          font-size: 0.9rem;
          font-weight: 600;
          color: #166534;
          margin: 0 0 2px;
        }
        .delivery-location-card-coords {
          font-size: 0.8rem;
          color: var(--text-muted);
          margin: 0;
        }
        .delivery-location-confirmed-actions {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          margin-top: 12px;
        }
        .delivery-location-mini-btn {
          min-height: 32px;
          padding: 0 12px;
          border-radius: 8px;
          border: 1px solid var(--border);
          background: var(--surface);
          color: var(--text);
          font-size: 0.8rem;
          font-weight: 600;
          font-family: inherit;
          cursor: pointer;
        }
        .delivery-location-mini-btn--remove {
          color: #b91c1c;
        }
        .delivery-location-gmaps-btn {
          flex-shrink: 0;
          margin-left: auto;
          display: inline-flex;
          align-items: center;
          padding: 8px 12px;
          font-size: 0.78rem;
          font-weight: 600;
          color: #fff;
          background: var(--accent);
          border-radius: var(--radius-sm);
          text-decoration: none;
          white-space: nowrap;
        }
        .delivery-location-gmaps-btn--inline {
          margin-left: auto;
        }
        .delivery-location-gmaps-btn:hover {
          background: #a88b5c;
        }
      `}</style>
    </div>
  );
}
