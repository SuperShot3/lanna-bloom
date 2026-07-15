'use client';

import type { Locale } from '@/lib/i18n';
import {
  convertFromThb,
  CURRENCY_DISPLAY_ENABLED,
  formatCurrency,
  formatThb,
  type DisplayCurrency,
} from '@/lib/currencyDisplay';
import { useCurrencyDisplay } from '@/contexts/CurrencyDisplayContext';

export function CurrencySelector({ lang, className = '' }: { lang: Locale; className?: string }) {
  const { currency, setCurrency, ratesAvailable } = useCurrencyDisplay();
  const label = lang === 'th' ? 'แสดงสกุลเงิน' : 'Display currency';
  if (!CURRENCY_DISPLAY_ENABLED) return null;

  return (
    <label className={className}>
      <span className="sr-only">{label}</span>
      <select
        value={currency}
        onChange={(event) => setCurrency(event.target.value as DisplayCurrency)}
        aria-label={label}
        className="h-9 cursor-pointer rounded-full border border-stone-200 bg-white/80 px-2 text-xs font-semibold text-[#1A3C34] outline-none focus:border-[#C5A059] focus:ring-2 focus:ring-[#C5A059]/20"
      >
        <option value="THB">THB ฿</option>
        <option value="USD" disabled={!ratesAvailable}>USD $</option>
        <option value="GBP" disabled={!ratesAvailable}>GBP £</option>
        <option value="AUD" disabled={!ratesAvailable}>AUD $</option>
        <option value="SGD" disabled={!ratesAvailable}>SGD $</option>
      </select>
    </label>
  );
}

export function CurrencyAmount({
  thb,
  lang,
  className = '',
  thbClassName = '',
  showEstimateLabel = true,
}: {
  thb: number;
  lang: Locale;
  className?: string;
  thbClassName?: string;
  showEstimateLabel?: boolean;
}) {
  const { currency, rates } = useCurrencyDisplay();
  const converted = convertFromThb(thb, currency, rates);
  const isEstimate = currency !== 'THB' && converted != null;
  const thbLabel = formatThb(thb, lang);

  if (!isEstimate) return <span className={className}>{thbLabel}</span>;

  return (
    <span className={className}>
      <span>{formatCurrency(converted, currency, lang)}</span>
      {showEstimateLabel ? (
        <span className={`ml-1 text-[0.72em] font-normal text-stone-500 ${thbClassName}`.trim()}>
          {lang === 'th' ? `(ประมาณการ · ${thbLabel})` : `(est. · ${thbLabel})`}
        </span>
      ) : (
        <span className="sr-only">{lang === 'th' ? `ประมาณการ อ้างอิง ${thbLabel}` : `estimated, based on ${thbLabel}`}</span>
      )}
    </span>
  );
}

export function ThbChargeNotice({ lang, className = '' }: { lang: Locale; className?: string }) {
  return (
    <p className={`rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-stone-700 ${className}`.trim()}>
      {lang === 'th'
        ? 'การชำระเงินจะถูกเรียกเก็บเป็นเงินบาทไทย (THB) ราคาสกุลเงินอื่นเป็นเพียงประมาณการ ธนาคารหรือผู้ออกบัตรของคุณเป็นผู้กำหนดอัตราแลกเปลี่ยนและอาจมีค่าธรรมเนียมเพิ่มเติม'
        : 'You will be charged in Thai baht (THB). Other currency prices are estimates; your card issuer sets the exchange rate and may charge additional fees.'}
    </p>
  );
}
