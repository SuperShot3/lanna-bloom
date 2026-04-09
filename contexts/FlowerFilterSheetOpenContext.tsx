'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

type FlowerFilterSheetOpenContextValue = {
  isOpen: boolean;
  setOpen: (open: boolean) => void;
};

const FlowerFilterSheetOpenContext = createContext<FlowerFilterSheetOpenContextValue | null>(null);

export function FlowerFilterSheetOpenProvider({ children }: { children: ReactNode }) {
  const [isOpen, setOpenState] = useState(false);
  const setOpen = useCallback((open: boolean) => setOpenState(open), []);
  const value = useMemo(() => ({ isOpen, setOpen }), [isOpen, setOpen]);
  return (
    <FlowerFilterSheetOpenContext.Provider value={value}>{children}</FlowerFilterSheetOpenContext.Provider>
  );
}

/** Used by the catalog mobile filter and chrome (e.g. hide LINE FAB while the sheet is open). */
export function useFlowerFilterSheetOpen(): FlowerFilterSheetOpenContextValue {
  const ctx = useContext(FlowerFilterSheetOpenContext);
  if (!ctx) {
    return { isOpen: false, setOpen: () => {} };
  }
  return ctx;
}
