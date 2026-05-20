'use client';

import { useEffect, useState } from 'react';

declare global {
  interface Window {
    google?: {
      maps?: {
        places?: unknown;
      };
    };
  }
}

const SCRIPT_ID = 'lanna-google-maps-places';

/** Loads Google Maps JavaScript API with Places library when API key is configured. */
export function useGooglePlacesScript(): { ready: boolean; hasKey: boolean } {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ?? '';
  const hasKey = apiKey.length > 0;
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!hasKey || typeof window === 'undefined') return;

    if (window.google?.maps?.places) {
      setReady(true);
      return;
    }

    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      const onLoad = () => setReady(Boolean(window.google?.maps?.places));
      existing.addEventListener('load', onLoad);
      if (window.google?.maps?.places) setReady(true);
      return () => existing.removeEventListener('load', onLoad);
    }

    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places&loading=async`;
    script.async = true;
    script.defer = true;
    script.onload = () => setReady(Boolean(window.google?.maps?.places));
    script.onerror = () => setReady(false);
    document.head.appendChild(script);

    return () => {
      script.onload = null;
    };
  }, [hasKey]);

  return { ready, hasKey };
}
