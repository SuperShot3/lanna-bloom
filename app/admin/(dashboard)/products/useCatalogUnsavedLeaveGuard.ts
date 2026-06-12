'use client';

import { useEffect } from 'react';

/** Warn when closing the tab with unsaved edits on the current product. */
export function useCatalogUnsavedLeaveGuard(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [enabled]);
}
