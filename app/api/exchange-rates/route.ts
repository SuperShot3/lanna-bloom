import { NextResponse } from 'next/server';
import type { CurrencyRates, DisplayCurrency } from '@/lib/currencyDisplay';

const SUPPORTED_REMOTE_CURRENCIES: DisplayCurrency[] = ['USD', 'GBP', 'AUD', 'SGD'];
const RATE_URL =
  'https://api.frankfurter.dev/v1/latest?base=THB&symbols=USD,GBP,AUD,SGD';

type FrankfurterResponse = {
  date?: string;
  rates?: Record<string, number>;
};

export const revalidate = 60 * 60 * 6;

export async function GET() {
  try {
    const response = await fetch(RATE_URL, {
      next: { revalidate },
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) throw new Error(`Exchange-rate provider returned ${response.status}`);

    const data = (await response.json()) as FrankfurterResponse;
    const rates: CurrencyRates = { THB: 1 };
    for (const currency of SUPPORTED_REMOTE_CURRENCIES) {
      const rate = data.rates?.[currency];
      if (typeof rate === 'number' && Number.isFinite(rate) && rate > 0) {
        rates[currency] = rate;
      }
    }

    if (Object.keys(rates).length === 1) throw new Error('Exchange-rate provider returned no usable rates');

    return NextResponse.json(
      { base: 'THB', rates, updatedAt: data.date ? `${data.date}T00:00:00.000Z` : new Date().toISOString() },
      { headers: { 'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=86400' } }
    );
  } catch {
    return NextResponse.json(
      { base: 'THB', rates: { THB: 1 }, updatedAt: new Date().toISOString() },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
