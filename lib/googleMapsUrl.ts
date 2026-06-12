/**
 * Simple validation: URL must look like a Google Maps share or open link.
 * Covers maps.google.com, regional google.com/maps paths, goo.gl/maps, maps.app.goo.gl, etc.
 */
export function isValidGoogleMapsUrl(raw: string): boolean {
  const s = raw.trim();
  if (!s) return false;
  let url: URL;
  try {
    url = new URL(/^[a-zA-Z][a-zA-Z+\-.]*:\/\//.test(s) ? s : `https://${s}`);
  } catch {
    return false;
  }
  const h = url.hostname.toLowerCase();
  if (h === 'maps.app.goo.gl' || h.endsWith('.maps.app.goo.gl')) return true;
  if (h === 'goo.gl' && url.pathname.startsWith('/maps')) return true;
  if (h === 'maps.google.com' || h === 'www.maps.google.com') return true;
  if (
    h === 'google.com' ||
    h === 'www.google.com' ||
    /^www\.google\.[a-z.]+$/.test(h) ||
    /^google\.[a-z.]+$/.test(h)
  ) {
    return url.pathname.startsWith('/maps') || url.pathname.includes('/maps/');
  }
  return false;
}
