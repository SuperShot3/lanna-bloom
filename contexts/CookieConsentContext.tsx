'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  type ConsentState,
  getDefaultConsent,
  readConsentFromDocumentCookie,
  writeConsentCookie,
} from '@/lib/cookieConsent';

type ConsentUi = {
  /** Whether the user has saved a choice at least once. */
  hasChoice: boolean;
  /** Current saved preferences (or default if none yet). */
  consent: ConsentState;
  /** Open/close preferences UI. */
  isPreferencesOpen: boolean;
  openPreferences: () => void;
  closePreferences: () => void;
  /** Actions */
  acceptAll: () => void;
  rejectNonEssential: () => void;
  savePreferences: (prefs: { analytics: boolean; marketing: boolean }) => void;
};

const CookieConsentContext = createContext<ConsentUi | null>(null);

export function CookieConsentProvider({ children }: { children: React.ReactNode }) {
  const [consent, setConsent] = useState<ConsentState>(getDefaultConsent());
  const [hasChoice, setHasChoice] = useState(false);
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);

  useEffect(() => {
    const saved = readConsentFromDocumentCookie();
    if (saved) {
      setConsent(saved);
      setHasChoice(true);
    }
  }, []);

  const persist = useCallback((next: ConsentState) => {
    const withTime: ConsentState = { ...next, t: new Date().toISOString() };
    setConsent(withTime);
    setHasChoice(true);
    writeConsentCookie(withTime);
    // Broadcast to any listeners (e.g. analytics bootstrap) without tight coupling.
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('lb:cookie-consent', { detail: withTime }));
    }
  }, []);

  const openPreferences = useCallback(() => setIsPreferencesOpen(true), []);
  const closePreferences = useCallback(() => setIsPreferencesOpen(false), []);

  const acceptAll = useCallback(() => {
    persist({ v: 1, a: true, m: true, t: new Date().toISOString() });
    closePreferences();
  }, [persist, closePreferences]);

  const rejectNonEssential = useCallback(() => {
    persist({ v: 1, a: false, m: false, t: new Date().toISOString() });
    closePreferences();
  }, [persist, closePreferences]);

  const savePreferences = useCallback(
    (prefs: { analytics: boolean; marketing: boolean }) => {
      persist({ v: 1, a: Boolean(prefs.analytics), m: Boolean(prefs.marketing), t: new Date().toISOString() });
      closePreferences();
    },
    [persist, closePreferences]
  );

  const value = useMemo<ConsentUi>(
    () => ({
      hasChoice,
      consent,
      isPreferencesOpen,
      openPreferences,
      closePreferences,
      acceptAll,
      rejectNonEssential,
      savePreferences,
    }),
    [hasChoice, consent, isPreferencesOpen, openPreferences, closePreferences, acceptAll, rejectNonEssential, savePreferences]
  );

  return <CookieConsentContext.Provider value={value}>{children}</CookieConsentContext.Provider>;
}

export function useCookieConsent(): ConsentUi {
  const ctx = useContext(CookieConsentContext);
  if (!ctx) throw new Error('useCookieConsent must be used within CookieConsentProvider');
  return ctx;
}

