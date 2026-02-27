'use client';

import { useEffect } from 'react';

const STORAGE_KEY = 'partner-apply-draft';

export function ClearDraft() {
  useEffect(() => {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, []);
  return null;
}
