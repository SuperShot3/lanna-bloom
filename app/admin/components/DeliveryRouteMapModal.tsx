'use client';

import { useEffect, useState } from 'react';
import type { SupabaseOrderRow } from '@/lib/supabase/adminQueries';
import { deliveryCoordsFromOrder } from '@/lib/admin/deliveryBoardPreview';

const OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

function fixLeafletIcon(): void {
  if (typeof window === 'undefined') return;
  const L = require('leaflet');
  const iconUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png';
  const shadowUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png';
  delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
  L.Icon.Default.mergeOptions({ iconUrl, shadowUrl });
}

export interface MapMarkerOrder {
  order: SupabaseOrderRow;
  lat: number;
  lng: number;
}

export function buildMapMarkers(orders: SupabaseOrderRow[]): MapMarkerOrder[] {
  const out: MapMarkerOrder[] = [];
  for (const order of orders) {
    const c = deliveryCoordsFromOrder(order);
    if (c) out.push({ order, ...c });
  }
  return out;
}

export function DeliveryRouteMapModal({
  markers,
  onClose,
}: {
  markers: MapMarkerOrder[];
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    fixLeafletIcon();
    setMounted(true);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="admin-delivery-map-overlay" role="dialog" aria-modal="true" aria-label="Route map">
      <button type="button" className="admin-delivery-map-backdrop" aria-label="Close map" onClick={onClose} />
      <div className="admin-delivery-map-panel">
        <header className="admin-delivery-map-header">
          <h2 className="admin-delivery-map-title">Route view</h2>
          <p className="admin-delivery-map-sub">
            {markers.length === 0
              ? 'No pinned delivery coordinates on these orders. Customers can add a pin at checkout; older orders may only have an address.'
              : `${markers.length} stop${markers.length === 1 ? '' : 's'} with map coordinates`}
          </p>
          <button type="button" className="admin-btn admin-btn-sm" onClick={onClose}>
            Close
          </button>
        </header>
        <div className="admin-delivery-map-frame">
          {mounted && markers.length > 0 ? <MapBody markers={markers} /> : null}
        </div>
      </div>
    </div>
  );
}

function MapBody({ markers }: { markers: MapMarkerOrder[] }) {
  const { MapContainer, TileLayer, Marker, Popup } = require('react-leaflet');
  const avgLat = markers.reduce((s, m) => s + m.lat, 0) / markers.length;
  const avgLng = markers.reduce((s, m) => s + m.lng, 0) / markers.length;

  return (
    <MapContainer center={[avgLat, avgLng]} zoom={12} style={{ height: '100%', width: '100%' }} scrollWheelZoom>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution={OSM_ATTRIBUTION} />
      {markers.map(({ order, lat, lng }) => (
        <Marker key={order.order_id} position={[lat, lng]}>
          <Popup>
            <strong>{order.order_id}</strong>
            <br />
            {order.recipient_name ?? order.customer_name ?? '—'}
            <br />
            <a href={`/admin/orders/${encodeURIComponent(order.order_id)}`} className="admin-link">
              Open order
            </a>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
