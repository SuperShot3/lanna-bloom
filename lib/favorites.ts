import type { SizeKey } from '@/lib/bouquets';

export const FAVORITES_STORAGE_KEY = 'lanna-bloom-favorites';
export const PREFERRED_BOUQUET_SIZE_STORAGE_KEY_PREFIX = 'lanna-bloom-preferred-bouquet-size';

export type FavoriteSize = {
  sizeKey: SizeKey;
  sizeLabel: string;
  sizePrice: number;
};

export type FavoriteItem = {
  id: string;
  /** Display name for the current locale at time of saving. */
  name: string;
  /** Full names are optional, but when available they let favorites render correctly for other locales. */
  nameEn?: string;
  nameTh?: string;
  price: number;
  image: string;
  slug: string;
  url?: string;
  options?: FavoriteSize;
};

type FavoritesEventDetail = { count: number };

function dispatchFavoritesUpdated(count: number) {
  // Helps sync all mounted components in the same tab without relying on `storage` event quirks.
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<FavoritesEventDetail>('favorites-updated', { detail: { count } }));
}

function readFromSessionStorage(): FavoriteItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.sessionStorage.getItem(FAVORITES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed as FavoriteItem[];
  } catch {
    return [];
  }
}

function writeToSessionStorage(favorites: FavoriteItem[]) {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites));
  } catch {
    // ignore quota/security errors
  }
}

export function getFavorites(): FavoriteItem[] {
  return readFromSessionStorage();
}

export function isFavorite(id: string): boolean {
  if (!id) return false;
  const list = readFromSessionStorage();
  return list.some((f) => f.id === id);
}

export function addFavorite(item: FavoriteItem) {
  if (!item?.id) return;
  const list = readFromSessionStorage();

  // Dedupe per product id; update stored payload if it already exists.
  const without = list.filter((f) => f.id !== item.id);
  const next = [...without, item];
  writeToSessionStorage(next);
  dispatchFavoritesUpdated(next.length);
}

export function removeFavorite(id: string) {
  if (!id) return;
  const list = readFromSessionStorage();
  const next = list.filter((f) => f.id !== id);
  writeToSessionStorage(next);
  dispatchFavoritesUpdated(next.length);
}

export function getFavoritesCount(): number {
  return readFromSessionStorage().length;
}

function preferredSizeKeyForBouquet(bouquetId: string) {
  return `${PREFERRED_BOUQUET_SIZE_STORAGE_KEY_PREFIX}:${bouquetId}`;
}

export function setPreferredBouquetSize(bouquetId: string, sizeKey: SizeKey) {
  if (typeof window === 'undefined') return;
  if (!bouquetId) return;
  try {
    window.sessionStorage.setItem(preferredSizeKeyForBouquet(bouquetId), sizeKey);
  } catch {
    // ignore
  }
}

export function getPreferredBouquetSize(bouquetId: string): SizeKey | undefined {
  if (typeof window === 'undefined') return undefined;
  if (!bouquetId) return undefined;
  try {
    const raw = window.sessionStorage.getItem(preferredSizeKeyForBouquet(bouquetId));
    if (!raw) return undefined;
    if (raw === 's' || raw === 'm' || raw === 'l' || raw === 'xl') return raw;
    return undefined;
  } catch {
    return undefined;
  }
}

export function takePreferredBouquetSize(bouquetId: string): SizeKey | undefined {
  if (typeof window === 'undefined') return undefined;
  if (!bouquetId) return undefined;
  try {
    const raw = window.sessionStorage.getItem(preferredSizeKeyForBouquet(bouquetId));
    if (!raw) return undefined;
    window.sessionStorage.removeItem(preferredSizeKeyForBouquet(bouquetId));
    if (raw === 's' || raw === 'm' || raw === 'l' || raw === 'xl') return raw;
    return undefined;
  } catch {
    return undefined;
  }
}

