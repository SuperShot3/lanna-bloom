const DEFAULT_DELETE_CONFIRM_MESSAGE = 'Are you sure you want to delete this record? This cannot be undone.';

export function confirmDeleteAction(message: string = DEFAULT_DELETE_CONFIRM_MESSAGE): boolean {
  if (typeof window === 'undefined') return false;
  return window.confirm(message);
}

/** Catalog bouquet / product delete (admin Products studio & moderation). */
export function confirmCatalogDeleteAction(itemLabel?: string): boolean {
  const label = itemLabel?.trim();
  const message = label
    ? `Are you sure you want to delete "${label}"? This cannot be undone.`
    : 'Are you sure you want to delete? This cannot be undone.';
  return confirmDeleteAction(message);
}
