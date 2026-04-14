const DEFAULT_DELETE_CONFIRM_MESSAGE = 'Are you sure you want to delete this record? This cannot be undone.';

export function confirmDeleteAction(message: string = DEFAULT_DELETE_CONFIRM_MESSAGE): boolean {
  if (typeof window === 'undefined') return false;
  return window.confirm(message);
}
