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
  addListener: (
    name: string,
    fn: (e: { latLng?: GoogleLatLng | null }) => void
  ) => GoogleMapsListener;
};

type GoogleMarker = {
  setPosition: (c: { lat: number; lng: number }) => void;
  getPosition: () => GoogleLatLng | null;
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

function emitPin(
  lat: number,
  lng: number,
  onChange: (v: DeliveryLocationValue | null) => void
): void {
  onChange({
    lat,
    lng,
    googleMapsUrl: buildDriverMapsSearchUrl(lat, lng),
  });
}

export function DeliveryLocationPicker({
  value,
  onChange,
  destinationId,
  highlight = false,
  mapElementId = 'checkout-delivery-address-map',
  dropPinPrompt = 'Click the map to set delivery location.',
  selectedLocationLabel = 'Selected:',
  openInGoogleMapsLabel = 'Open in Google Maps',
  mapUnavailableLabel = 'The map could not load. You can still continue with your address.',
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
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<GoogleMap | null>(null);
  const markerRef = useRef<GoogleMarker | null>(null);
  const listenersRef = useRef<GoogleMapsListener[]>([]);
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  const destinationIdRef = useRef(destinationId);
  valueRef.current = value;
  onChangeRef.current = onChange;
  destinationIdRef.current = destinationId;

  const [mounted, setMounted] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const apiKey = getGoogleMapsApiKey();

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
      emitPin(pos.lat(), pos.lng(), onChangeRef.current);
    });
    listenersRef.current.push(dragListener);
    markerRef.current = marker;
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
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

        const current = valueRef.current;
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
        });
        mapRef.current = map;

        const clickListener = map.addListener('click', (e) => {
          const latLng = e.latLng;
          if (!latLng) return;
          const lat = latLng.lat();
          const lng = latLng.lng();
          syncMarker(maps, map, lat, lng);
          emitPin(lat, lng, onChangeRef.current);
        });
        listenersRef.current.push(clickListener);

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
    // Recreate only when destination changes before a pin exists — handled below without remounting.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- init once per mount/key
  }, [mounted, apiKey, syncMarker]);

  useEffect(() => {
    const map = mapRef.current;
    const maps = typeof window !== 'undefined' ? getGoogleMapsApi() : null;
    if (!map || !maps) return;
    if (value) {
      syncMarker(maps, map, value.lat, value.lng);
      map.panTo({ lat: value.lat, lng: value.lng });
      return;
    }
    map.panTo(mapCenterForDestination(destinationId));
  }, [value, destinationId, syncMarker]);

  return (
    <div className={`delivery-location-picker${highlight ? ' delivery-location-picker--highlight' : ''}`}>
      <div
        id={mapElementId}
        className="delivery-location-map-wrap"
        ref={containerRef}
        role="application"
        aria-label={dropPinPrompt}
        style={{ minHeight: 280, width: '100%' }}
      />
      {unavailable ? (
        <p className="delivery-location-readout" aria-live="polite">
          {mapUnavailableLabel}
        </p>
      ) : value == null ? (
        <p className="delivery-location-readout" aria-live="polite">
          {dropPinPrompt}
        </p>
      ) : (
        <div className="delivery-location-card" aria-live="polite">
          <p className="delivery-location-card-label">{selectedLocationLabel}</p>
          <p className="delivery-location-card-coords">
            {value.lat.toFixed(5)}, {value.lng.toFixed(5)}
          </p>
          <a
            href={value.googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="delivery-location-gmaps-btn"
          >
            {openInGoogleMapsLabel}
          </a>
        </div>
      )}
      <style jsx>{`
        .delivery-location-picker {
          margin-top: 0;
        }
        .delivery-location-map-wrap {
          height: 280px;
          width: 100%;
          border-radius: 14px;
          border: 1px solid var(--border);
          overflow: hidden;
          background: var(--pastel-cream);
        }
        .delivery-location-picker--highlight .delivery-location-map-wrap {
          border-color: color-mix(in srgb, var(--accent) 55%, var(--border));
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent-soft) 65%, transparent);
        }
        @media (min-width: 768px) {
          .delivery-location-map-wrap {
            height: 360px;
          }
        }
        .delivery-location-readout {
          font-size: 0.85rem;
          color: var(--text-muted);
          margin: 10px 0 0;
          line-height: 1.45;
        }
        .delivery-location-card {
          margin-top: 12px;
          padding: 14px 16px;
          background: var(--pastel-cream, #f9f5f0);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
        }
        .delivery-location-card-label {
          font-size: 0.9rem;
          font-weight: 600;
          color: var(--text);
          margin: 0 0 4px;
        }
        .delivery-location-card-coords {
          font-size: 0.85rem;
          color: var(--text-muted);
          margin: 0 0 12px;
        }
        .delivery-location-gmaps-btn {
          display: inline-block;
          padding: 10px 20px;
          font-size: 0.9rem;
          font-weight: 600;
          color: #fff;
          background: var(--accent);
          border-radius: var(--radius-sm);
          text-decoration: none;
          transition: background 0.2s, transform 0.15s;
        }
        .delivery-location-gmaps-btn:hover {
          background: #a88b5c;
          transform: translateY(-1px);
        }
      `}</style>
    </div>
  );
}
