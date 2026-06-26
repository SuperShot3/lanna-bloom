'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { readCookieConsent, setCookieConsent, type CookieConsentValue } from '@/lib/cookies/consent';

export type CookieConsentStatus = CookieConsentValue | null;

type CookieConsentContextValue = {
  status: CookieConsentStatus;
  hydrated: boolean;
  accept: () => void;
  reject: () => void;
};

const CookieConsentContext = createContext<CookieConsentContextValue | null>(null);

function pushConsentUpdate(granted: boolean): void {
  if (typeof window === 'undefined') return;
  window.dataLayer = window.dataLayer || [];
  const storage = granted ? 'granted' : 'denied';
  const gtag = (...args: unknown[]) => {
    (window.dataLayer as unknown[]).push(args);
  };
  gtag('consent', 'update', {
    analytics_storage: storage,
    ad_storage: storage,
    ad_user_data: storage,
    ad_personalization: storage,
  });
}

export function CookieConsentProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<CookieConsentStatus>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setStatus(readCookieConsent());
    setHydrated(true);
  }, []);

  const accept = useCallback(() => {
    setCookieConsent('accepted');
    setStatus('accepted');
    pushConsentUpdate(true);
  }, []);

  const reject = useCallback(() => {
    setCookieConsent('rejected');
    setStatus('rejected');
  }, []);

  const value = useMemo(
    () => ({ status, hydrated, accept, reject }),
    [status, hydrated, accept, reject]
  );

  return <CookieConsentContext.Provider value={value}>{children}</CookieConsentContext.Provider>;
}

export function useCookieConsent(): CookieConsentContextValue {
  const ctx = useContext(CookieConsentContext);
  if (!ctx) {
    return {
      status: null,
      hydrated: false,
      accept: () => {},
      reject: () => {},
    };
  }
  return ctx;
}
