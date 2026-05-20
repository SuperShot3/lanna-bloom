/** Google Maps search link for drivers/admin from coordinates. */
export function buildDriverMapsSearchUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lng}`)}`;
}

export function buildStaticMapPreviewUrl(
  lat: number,
  lng: number,
  apiKey: string,
  opts?: { width?: number; height?: number; zoom?: number }
): string {
  const w = opts?.width ?? 600;
  const h = opts?.height ?? 160;
  const zoom = opts?.zoom ?? 16;
  const center = `${lat},${lng}`;
  const marker = `color:0xC45C7A%7C${center}`;
  const params = new URLSearchParams({
    center,
    zoom: String(zoom),
    size: `${w}x${h}`,
    scale: '2',
    markers: marker,
    key: apiKey,
  });
  return `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}`;
}
