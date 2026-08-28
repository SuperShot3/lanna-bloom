/** Official Google Preferred Sources URLs for lannabloom.shop. */

export const GOOGLE_PREFERRED_SOURCE_QUERY = 'lannabloom.shop';

export const GOOGLE_PREFERRED_SOURCE_DEEPLINK = `https://www.google.com/preferences/source?q=${GOOGLE_PREFERRED_SOURCE_QUERY}`;

export const GOOGLE_PREFERRED_SOURCE_SCRIPT_URL =
  'https://news.google.com/swg/js/v1/publisher.js';

export type PreferredSourceClient = {
  init: (options: { theme?: 'light' | 'dark'; lang?: string }) => void;
  addPreferredSource: () => void;
};

type PreferredSourceWindow = Window & {
  PREFERRED_SOURCE?: Array<(client: PreferredSourceClient) => void>;
};

let preferredSourceClient: PreferredSourceClient | null = null;
let queueBound = false;

export function bindPreferredSourceQueue(): void {
  if (typeof window === 'undefined' || queueBound) return;
  queueBound = true;

  const w = window as PreferredSourceWindow;
  (w.PREFERRED_SOURCE = w.PREFERRED_SOURCE || []).push((client) => {
    const theme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    client.init({ theme });
    preferredSourceClient = client;
  });
}

export function tryAddPreferredSource(): boolean {
  if (!preferredSourceClient) return false;
  try {
    preferredSourceClient.addPreferredSource();
    return true;
  } catch {
    return false;
  }
}
