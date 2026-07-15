export const DISPLAY_CURRENCIES = ['THB', 'USD', 'GBP', 'AUD', 'SGD'] as const;

export type DisplayCurrency = (typeof DISPLAY_CURRENCIES)[number];

export const DEFAULT_DISPLAY_CURRENCY: DisplayCurrency = 'THB';
export const CURRENCY_DISPLAY_STORAGE_KEY = 'lanna-bloom-display-currency';
/** Set NEXT_PUBLIC_CURRENCY_DISPLAY_ENABLED=false to disable estimates immediately. */
export const CURRENCY_DISPLAY_ENABLED = process.env.NEXT_PUBLIC_CURRENCY_DISPLAY_ENABLED !== 'false';

export type CurrencyRates = Partial<Record<DisplayCurrency, number>>;

export type ExchangeRatesResponse = {
  base: 'THB';
  rates: CurrencyRates;
  updatedAt: string;
};

export function isDisplayCurrency(value: unknown): value is DisplayCurrency {
  return typeof value === 'string' && DISPLAY_CURRENCIES.includes(value as DisplayCurrency);
}

export function convertFromThb(amount: number, currency: DisplayCurrency, rates: CurrencyRates): number | null {
  if (!Number.isFinite(amount)) return null;
  if (currency === 'THB') return amount;
  const rate = rates[currency];
  return typeof rate === 'number' && Number.isFinite(rate) && rate > 0 ? amount * rate : null;
}

export function formatCurrency(amount: number, currency: DisplayCurrency, lang: string): string {
  return new Intl.NumberFormat(lang === 'th' ? 'th-TH' : 'en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: currency === 'THB' ? 0 : 2,
    maximumFractionDigits: currency === 'THB' ? 2 : 2,
  }).format(amount);
}

export function formatThb(amount: number, lang = 'en'): string {
  return formatCurrency(amount, 'THB', lang);
}
