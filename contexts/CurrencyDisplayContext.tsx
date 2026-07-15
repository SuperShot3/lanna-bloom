'use client';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  CURRENCY_DISPLAY_STORAGE_KEY,
  CURRENCY_DISPLAY_ENABLED,
  DEFAULT_DISPLAY_CURRENCY,
  type CurrencyRates,
  type DisplayCurrency,
  isDisplayCurrency,
} from '@/lib/currencyDisplay';

type CurrencyDisplayContextValue = {
  currency: DisplayCurrency;
  rates: CurrencyRates;
  setCurrency: (currency: DisplayCurrency) => void;
  ratesAvailable: boolean;
};

const CurrencyDisplayContext = createContext<CurrencyDisplayContextValue | null>(null);

export function CurrencyDisplayProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<DisplayCurrency>(DEFAULT_DISPLAY_CURRENCY);
  const [rates, setRates] = useState<CurrencyRates>({ THB: 1 });
  const [ratesAvailable, setRatesAvailable] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(CURRENCY_DISPLAY_STORAGE_KEY);
      if (isDisplayCurrency(saved)) setCurrencyState(saved);
    } catch {
      // Local storage is optional; THB remains the safe default.
    }
  }, []);

  useEffect(() => {
    if (!CURRENCY_DISPLAY_ENABLED) return;
    let cancelled = false;
    void fetch('/api/exchange-rates')
      .then(async (response) => {
        if (!response.ok) throw new Error('Unable to load exchange rates');
        return (await response.json()) as { rates?: CurrencyRates };
      })
      .then((data) => {
        if (cancelled || !data.rates) return;
        setRates({ THB: 1, ...data.rates });
        setRatesAvailable(Object.keys(data.rates).some((key) => key !== 'THB'));
      })
      .catch(() => {
        if (!cancelled) setRatesAvailable(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const setCurrency = (nextCurrency: DisplayCurrency) => {
    setCurrencyState(nextCurrency);
    try {
      window.localStorage.setItem(CURRENCY_DISPLAY_STORAGE_KEY, nextCurrency);
    } catch {
      // The visual preference need not block shopping.
    }
  };

  const value = useMemo(
    () => ({ currency, rates, setCurrency, ratesAvailable }),
    [currency, rates, ratesAvailable]
  );

  return <CurrencyDisplayContext.Provider value={value}>{children}</CurrencyDisplayContext.Provider>;
}

export function useCurrencyDisplay(): CurrencyDisplayContextValue {
  const value = useContext(CurrencyDisplayContext);
  if (!value) throw new Error('useCurrencyDisplay must be used within CurrencyDisplayProvider');
  return value;
}
