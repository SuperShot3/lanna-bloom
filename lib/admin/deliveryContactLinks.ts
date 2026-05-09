/**
 * Build tel: / wa.me links from order phone fields (Thailand default CC 66).
 */

export function e164Digits(phone: string | null | undefined, countryCode: string | null | undefined): string | null {
  const raw = (phone ?? '').trim();
  if (!raw) return null;
  let digits = raw.replace(/\D/g, '');
  const cc = (countryCode?.replace(/\D/g, '') || '66') || '66';
  if (digits.startsWith(cc)) return digits;
  if (digits.startsWith('0')) return cc + digits.slice(1);
  if (cc === '66' && digits.length === 9) return cc + digits;
  return cc + digits;
}

export function telHref(phone: string | null | undefined, countryCode: string | null | undefined): string | null {
  const d = e164Digits(phone, countryCode);
  if (!d) return null;
  return `tel:+${d}`;
}

export function whatsappHref(phone: string | null | undefined, countryCode: string | null | undefined): string | null {
  const d = e164Digits(phone, countryCode);
  if (!d) return null;
  return `https://wa.me/${d}`;
}

/** E.164 with leading + (for display copy / sharing). */
export function phoneInternational(phone: string | null | undefined, countryCode: string | null | undefined): string | null {
  const d = e164Digits(phone, countryCode);
  if (!d) return null;
  return `+${d}`;
}
