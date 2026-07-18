const CATALOG_RETURN_KEY = 'lanna-bloom:catalog-return';

type CatalogReturnMarker = {
  targetPath: string;
};

function pathFromHref(href: string): string | null {
  try {
    return new URL(href, window.location.origin).pathname;
  } catch {
    return null;
  }
}

export function rememberCatalogProductNavigation(href: string): void {
  if (typeof window === 'undefined') return;

  const targetPath = pathFromHref(href);
  if (!targetPath) return;

  try {
    const marker: CatalogReturnMarker = { targetPath };
    window.sessionStorage.setItem(CATALOG_RETURN_KEY, JSON.stringify(marker));
  } catch {
    // Navigation must still work when storage is unavailable.
  }
}

export function consumeCatalogProductNavigation(): boolean {
  if (typeof window === 'undefined') return false;

  try {
    const raw = window.sessionStorage.getItem(CATALOG_RETURN_KEY);
    window.sessionStorage.removeItem(CATALOG_RETURN_KEY);
    if (!raw) return false;

    const marker = JSON.parse(raw) as Partial<CatalogReturnMarker>;
    return marker.targetPath === window.location.pathname;
  } catch {
    return false;
  }
}
