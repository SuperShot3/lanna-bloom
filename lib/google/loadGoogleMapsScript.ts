const SCRIPT_ID = 'lanna-google-maps-js';

let loadPromise: Promise<void> | null = null;

export function getGoogleMapsApiKey(): string {
  return process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ?? '';
}

/** Maps JavaScript API only — do not request Places or other libraries. */
export function loadGoogleMapsScript(apiKey: string): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Google Maps can only load in the browser'));
  }
  if (!apiKey) {
    return Promise.reject(new Error('Google Maps API key is missing'));
  }
  const existingMaps = (window as Window & { google?: { maps?: { Map?: unknown } } }).google?.maps;
  if (existingMaps?.Map) return Promise.resolve();
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    const finishOk = () => resolve();
    const finishErr = () => {
      loadPromise = null;
      reject(new Error('Failed to load Google Maps'));
    };

    const existing = document.getElementById(SCRIPT_ID);
    if (existing) {
      existing.addEventListener('load', finishOk, { once: true });
      existing.addEventListener('error', finishErr, { once: true });
      return;
    }

    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}`;
    script.async = true;
    script.defer = true;
    script.onload = finishOk;
    script.onerror = finishErr;
    document.head.appendChild(script);
  });

  return loadPromise;
}
