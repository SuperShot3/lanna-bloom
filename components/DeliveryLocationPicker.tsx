'use client';

import { useState, useEffect } from 'react';

export interface DeliveryLocationValue {
  lat: number;
  lng: number;
  googleMapsUrl: string;
}

const CHIANG_MAI_CENTER: [number, number] = [18.7883, 98.9853];
const ZOOM = 13;
const OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

export function buildGoogleMapsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

/** Fix Leaflet default marker icon in Next.js / iOS Safari (relative paths break). */
function fixLeafletIcon(): void {
  if (typeof window === 'undefined') return;
  const L = require('leaflet');
  const iconUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png';
  const shadowUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png';
  delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
  L.Icon.Default.mergeOptions({ iconUrl, shadowUrl });
}

function MapInner({
  value,
  onChange,
}: {
  value: DeliveryLocationValue | null;
  onChange: (v: DeliveryLocationValue | null) => void;
}) {
  const { MapContainer, TileLayer, Marker, useMapEvents } = require('react-leaflet');

  function ClickHandler() {
    useMapEvents({
      click(e: { latlng: { lat: number; lng: number } }) {
        const { lat, lng } = e.latlng;
        onChange({
          lat,
          lng,
          googleMapsUrl: buildGoogleMapsUrl(lat, lng),
        });
      },
    });
    return null;
  }

  return (
    <MapContainer
      center={CHIANG_MAI_CENTER}
      zoom={ZOOM}
      className="delivery-location-map-inner"
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution={OSM_ATTRIBUTION}
      />
      <ClickHandler />
      {value != null && <Marker position={[value.lat, value.lng]} />}
    </MapContainer>
  );
}

export function DeliveryLocationPicker({
  value,
  onChange,
  dropPinPrompt = 'Click the map to set delivery location.',
  selectedLocationLabel = 'Selected:',
  openInGoogleMapsLabel = 'Open in Google Maps',
}: {
  value: DeliveryLocationValue | null;
  onChange: (v: DeliveryLocationValue | null) => void;
  dropPinPrompt?: string;
  selectedLocationLabel?: string;
  openInGoogleMapsLabel?: string;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    fixLeafletIcon();
  }, []);

  if (!mounted) {
    return (
      <div className="delivery-location-picker delivery-location-picker-placeholder">
        <div className="delivery-location-map-wrap" style={{ height: 320 }} />
        <p className="delivery-location-readout">{dropPinPrompt}</p>
        <style jsx>{`
          .delivery-location-picker-placeholder .delivery-location-map-wrap {
            background: var(--pastel-cream);
            border-radius: var(--radius);
            border: 1px solid var(--border);
          }
          .delivery-location-readout {
            font-size: 0.85rem;
            color: var(--text-muted);
            margin: 10px 0 0;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="delivery-location-picker">
      <div className="delivery-location-map-wrap">
        <MapInner value={value} onChange={onChange} />
      </div>
      <p className="delivery-location-readout" aria-live="polite">
        {value == null ? (
          dropPinPrompt
        ) : (
          <>
            {selectedLocationLabel} {value.lat.toFixed(5)}, {value.lng.toFixed(5)}{' '}
            <a
              href={value.googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="delivery-location-gmaps-link"
            >
              {openInGoogleMapsLabel}
            </a>
          </>
        )}
      </p>
      <style jsx>{`
        .delivery-location-picker {
          margin-top: 12px;
        }
        .delivery-location-map-wrap {
          height: 320px;
          width: 100%;
          border-radius: var(--radius);
          border: 1px solid var(--border);
          overflow: hidden;
        }
        .delivery-location-map-wrap :global(.leaflet-container) {
          height: 100% !important;
        }
        @media (min-width: 768px) {
          .delivery-location-map-wrap {
            height: 420px;
          }
        }
        .delivery-location-readout {
          font-size: 0.85rem;
          color: var(--text-muted);
          margin: 10px 0 0;
        }
        .delivery-location-gmaps-link {
          color: var(--accent);
          font-weight: 600;
          text-decoration: underline;
        }
        .delivery-location-gmaps-link:hover {
          color: #967a4d;
        }
      `}</style>
    </div>
  );
}