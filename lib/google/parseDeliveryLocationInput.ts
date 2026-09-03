import { isValidGoogleMapsUrl } from '@/lib/googleMapsUrl';

export type ParsedDeliveryLocation =
  | { kind: 'coords'; lat: number; lng: number }
  | { kind: 'mapsUrl'; url: string; lat: number | null; lng: number | null }
  | { kind: 'invalid' };

const COORDS_ONLY =
  /^(-?\d+(?:\.\d+)?)\s*[,;]\s*(-?\d+(?:\.\d+)?)$|^(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)$/;

function isFiniteCoordPair(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

function parseCoordPair(text: string): { lat: number; lng: number } | null {
  const trimmed = text.trim();
  const m = trimmed.match(COORDS_ONLY);
  if (!m) return null;
  const lat = Number(m[1] ?? m[3]);
  const lng = Number(m[2] ?? m[4]);
  if (!isFiniteCoordPair(lat, lng)) return null;
  return { lat, lng };
}

function normalizeHttpUrl(raw: string): string {
  const s = raw.trim();
  return /^[a-zA-Z][a-zA-Z+\-.]*:\/\//.test(s) ? s : `https://${s}`;
}

function extractCoordsFromMapsUrl(url: URL): { lat: number; lng: number } | null {
  const href = url.href;
  const pin3d4d = href.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
  if (pin3d4d) {
    const lat = Number(pin3d4d[1]);
    const lng = Number(pin3d4d[2]);
    if (isFiniteCoordPair(lat, lng)) return { lat, lng };
  }

  const at =
    url.pathname.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/) ??
    href.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (at) {
    const lat = Number(at[1]);
    const lng = Number(at[2]);
    if (isFiniteCoordPair(lat, lng)) return { lat, lng };
  }

  for (const key of ['q', 'query', 'll']) {
    const v = url.searchParams.get(key);
    if (!v) continue;
    const decoded = decodeURIComponent(v.replace(/\+/g, ' '));
    const exact = parseCoordPair(decoded);
    if (exact) return exact;
    const loose = decoded.match(/^(-?\d+(?:\.\d+)?)\s*[, ]\s*(-?\d+(?:\.\d+)?)/);
    if (loose) {
      const lat = Number(loose[1]);
      const lng = Number(loose[2]);
      if (isFiniteCoordPair(lat, lng)) return { lat, lng };
    }
  }

  return null;
}

/** Accept only a lat/lng pair or a Google Maps link. Reject free text. */
export function parseDeliveryLocationInput(raw: string): ParsedDeliveryLocation {
  const trimmed = raw.trim();
  if (!trimmed) return { kind: 'invalid' };

  if (isValidGoogleMapsUrl(trimmed)) {
    const normalized = normalizeHttpUrl(trimmed);
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(normalized);
    } catch {
      return { kind: 'invalid' };
    }
    const coords = extractCoordsFromMapsUrl(parsedUrl);
    return {
      kind: 'mapsUrl',
      url: normalized,
      lat: coords?.lat ?? null,
      lng: coords?.lng ?? null,
    };
  }

  const coords = parseCoordPair(trimmed);
  if (coords) return { kind: 'coords', lat: coords.lat, lng: coords.lng };

  return { kind: 'invalid' };
}
