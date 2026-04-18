/**
 * Client-side phone hints and light validation for checkout-style inputs.
 * Server/API rules stay authoritative; this guides users before submit.
 */

export const CHECKOUT_NATIONAL_MIN = 8;
export const CHECKOUT_NATIONAL_MAX = 15;

/** Single field with country code included (e.g. custom order, prompts). */
export const FULL_PHONE_MIN = 9;
export const FULL_PHONE_MAX = 16;

export type PhoneHintTone = 'neutral' | 'tip' | 'warn' | 'success';

export type NationalPhoneMessageKey =
  | 'phoneHintNeutralNational'
  | 'phoneHintThSkipLeadingZero'
  | 'contactPhoneMinLength'
  | 'contactPhoneMaxLength'
  | 'contactPhoneDigitsOnly'
  | 'phoneHintLooksGood';

export type FullPhoneMessageKey =
  | 'phoneHintNeutralFull'
  | 'phoneHintThSkipLeadingZeroFull'
  | 'phoneHintTooShortFull'
  | 'phoneHintTooLongFull'
  | 'contactPhoneDigitsOnly'
  | 'phoneHintLooksGood';

export interface NationalPhoneHint {
  tone: PhoneHintTone;
  messageKey: NationalPhoneMessageKey;
}

export interface FullPhoneHint {
  tone: PhoneHintTone;
  messageKey: FullPhoneMessageKey;
}

/** National digits only; country code chosen separately (+66, +1, …). */
export function getNationalPhoneHint(countryCode: string, nationalDigits: string): NationalPhoneHint {
  const d = nationalDigits.trim();
  if (!d) {
    return { tone: 'neutral', messageKey: 'phoneHintNeutralNational' };
  }
  if (!/^\d+$/.test(d)) {
    return { tone: 'warn', messageKey: 'contactPhoneDigitsOnly' };
  }
  if (countryCode === '66' && d.startsWith('0')) {
    return { tone: 'tip', messageKey: 'phoneHintThSkipLeadingZero' };
  }
  if (d.length < CHECKOUT_NATIONAL_MIN) {
    return { tone: 'warn', messageKey: 'contactPhoneMinLength' };
  }
  if (d.length > CHECKOUT_NATIONAL_MAX) {
    return { tone: 'warn', messageKey: 'contactPhoneMaxLength' };
  }
  return { tone: 'success', messageKey: 'phoneHintLooksGood' };
}

export function nationalDigitsValidForCheckout(countryCode: string, nationalDigits: string): boolean {
  return getNationalPhoneHint(countryCode, nationalDigits).tone === 'success';
}

/**
 * After blur: strip a single leading 0 from Thai domestic mobiles (08… / 09…) when using +66.
 */
export function normalizeThailandNationalOnBlur(nationalDigits: string, countryCode: string): string {
  if (countryCode !== '66') return nationalDigits;
  if (!nationalDigits.startsWith('0')) return nationalDigits;
  if (nationalDigits.length < 10) return nationalDigits;
  return nationalDigits.slice(1);
}

/** Full-number field: digits only, optional leading + stripped by caller. */
export function getFullPhoneFieldHint(digits: string): FullPhoneHint {
  const d = digits.trim();
  if (!d) {
    return { tone: 'neutral', messageKey: 'phoneHintNeutralFull' };
  }
  if (!/^\d+$/.test(d)) {
    return { tone: 'warn', messageKey: 'contactPhoneDigitsOnly' };
  }
  if (d.startsWith('0') && d.length >= 10) {
    return { tone: 'tip', messageKey: 'phoneHintThSkipLeadingZeroFull' };
  }
  if (d.length < FULL_PHONE_MIN) {
    return { tone: 'warn', messageKey: 'phoneHintTooShortFull' };
  }
  if (d.length > FULL_PHONE_MAX) {
    return { tone: 'warn', messageKey: 'phoneHintTooLongFull' };
  }
  return { tone: 'success', messageKey: 'phoneHintLooksGood' };
}

export function fullPhoneDigitsValid(digits: string): boolean {
  return getFullPhoneFieldHint(digits).tone === 'success';
}

/** Thai domestic paste: 0 + nine digits → drop leading 0. */
export function normalizeFullPhoneOnBlur(digits: string): string {
  if (!digits.startsWith('0')) return digits;
  if (digits.length >= 10) return digits.slice(1);
  return digits;
}
