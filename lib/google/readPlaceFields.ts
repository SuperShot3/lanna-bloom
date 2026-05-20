import type { GoogleAddressComponent } from '@/lib/google/placesAddressComponents';

/** New Places API address component shape (camelCase). */
type NewAddressComponent = {
  longText?: string;
  shortText?: string;
  types?: string[];
};

/** Read lat/lng from Place.location (LatLng or literal). */
export function readPlaceLatLng(
  location: google.maps.LatLng | google.maps.LatLngLiteral | null | undefined
): { lat: number; lng: number } | null {
  if (!location) return null;
  const lat =
    typeof (location as google.maps.LatLng).lat === 'function'
      ? (location as google.maps.LatLng).lat()
      : (location as google.maps.LatLngLiteral).lat;
  const lng =
    typeof (location as google.maps.LatLng).lng === 'function'
      ? (location as google.maps.LatLng).lng()
      : (location as google.maps.LatLngLiteral).lng;
  if (typeof lat !== 'number' || typeof lng !== 'number') return null;
  return { lat, lng };
}

/** displayName may be a string or LocalizedText `{ text }`. */
export function readPlaceDisplayName(displayName: unknown): string {
  if (typeof displayName === 'string') return displayName.trim();
  if (displayName && typeof displayName === 'object' && 'text' in displayName) {
    return String((displayName as { text?: string }).text ?? '').trim();
  }
  return '';
}

/** Map new API addressComponents to legacy shape used by parsePlacesAddressComponents. */
export function newAddressComponentsToLegacy(
  components: NewAddressComponent[] | null | undefined
): GoogleAddressComponent[] {
  return (components ?? []).map((c) => ({
    long_name: c.longText?.trim() ?? '',
    short_name: c.shortText?.trim() ?? '',
    types: c.types ?? [],
  }));
}
