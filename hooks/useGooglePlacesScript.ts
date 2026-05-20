'use client';

import { useEffect, useState } from 'react';

const SCRIPT_ID = 'lanna-google-maps-places';
const CALLBACK_NAME = '__lannaGoogleMapsReady';
const LOAD_TIMEOUT_MS = 12_000;
const POLL_INTERVAL_MS = 80;

declare global {
  interface Window {
    google?: {
      maps?: {
        places?: unknown;
      };
    };
    [key: string]: unknown;
  }
}

function placesReady(): boolean {
  const places = window.google?.maps?.places as
    | { Autocomplete?: unknown; AutocompleteService?: unknown }
    | undefined;
  return Boolean(
    typeof window !== 'undefined' &&
      places &&
      (typeof places.Autocomplete === 'function' ||
        typeof places.AutocompleteService === 'function')
  );
}

/** Loads Google Maps JavaScript API with Places library when API key is configured. */
export function useGooglePlacesScript(): {
  ready: boolean;
  hasKey: boolean;
  loadError: boolean;
} {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ?? '';
  const hasKey = apiKey.length > 0;
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (!hasKey || typeof window === 'undefined') return;

    let cancelled = false;

    const markReady = () => {
      if (cancelled) return;
      const ok = placesReady();
      setReady(ok);
      if (ok) setLoadError(false);
      else setLoadError(true);
    };

    if (placesReady()) {
      markReady();
      return;
    }

    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;

    const onScriptReady = () => markReady();

    if (existing) {
      existing.addEventListener('load', onScriptReady);
      if (placesReady()) markReady();
    } else {
      const prevCallback = window[CALLBACK_NAME];
      window[CALLBACK_NAME] = () => {
        if (typeof prevCallback === 'function') {
          (prevCallback as () => void)();
        }
        onScriptReady();
      };

      const script = document.createElement('script');
      script.id = SCRIPT_ID;
      script.async = true;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places&loading=async&callback=${CALLBACK_NAME}`;
      script.onerror = () => {
        if (!cancelled) {
          setReady(false);
          setLoadError(true);
        }
      };
      document.head.appendChild(script);
    }

    const pollId = window.setInterval(() => {
      if (placesReady()) {
        window.clearInterval(pollId);
        markReady();
      }
    }, POLL_INTERVAL_MS);

    const timeoutId = window.setTimeout(() => {
      if (!cancelled && !placesReady()) {
        setReady(false);
        setLoadError(true);
      }
    }, LOAD_TIMEOUT_MS);

    return () => {
      cancelled = true;
      window.clearInterval(pollId);
      window.clearTimeout(timeoutId);
      existing?.removeEventListener('load', onScriptReady);
    };
  }, [hasKey]);

  return { ready, hasKey, loadError };
}
