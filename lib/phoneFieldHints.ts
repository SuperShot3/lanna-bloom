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
  | 'phoneHintNationalHasCountryCode'
  | 'phoneHintThSkipLeadingZero'
  | 'phoneHintTooShortNational'
  | 'phoneHintTooLongNational'
  | 'phoneHintInlineDigitsOnly'
  | 'phoneHintLooksGood';

export type FullPhoneMessageKey =
  | 'phoneHintNeutralFull'
  | 'phoneHintDuplicateThai66'
  | 'phoneHintThSkipLeadingZeroFull'
  | 'phoneHintTooShortFull'
  | 'phoneHintTooLongFull'
  | 'phoneHintInlineDigitsOnly'
  | 'phoneHintLooksGood';

export interface NationalPhoneHint {
  tone: PhoneHintTone;
  messageKey: NationalPhoneMessageKey;
}

export interface FullPhoneHint {
  tone: PhoneHintTone;
  messageKey: FullPhoneMessageKey;
}

/** National part pasted with country code again, e.g. +66 selected and "66952572645" in the box → 6669… */
export function nationalNumberIncludesCountryCode(countryCode: string, nationalDigits: string): boolean {
  const cc = countryCode.trim();
  if (!cc || !nationalDigits) return false;
  return nationalDigits.startsWith(cc) && nationalDigits.length > cc.length;
}

/**
 * Full digits start with 66 but the subscriber part again starts with 66 (double country code).
 * Valid: 66952572645. Invalid: 6666952572645.
 */
export function thaiFullPhoneHasDuplicateCountryCode(phoneDigits: string): boolean {
  if (!phoneDigits.startsWith('66')) return false;
  return phoneDigits.slice(2).startsWith('66');
}

/** Collapse accidental double Thailand country code (e.g. pasting 66 twice). Safe to run before validation. */
export function stripDuplicateThaiLeading66(phoneDigits: string): string {
  let d = phoneDigits.replace(/\D/g, '');
  while (thaiFullPhoneHasDuplicateCountryCode(d)) {
    d = d.slice(2);
  }
  return d;
}

/** National digits only; country code chosen separately (+66, +1, …). */
export function getNationalPhoneHint(countryCode: string, nationalDigits: string): NationalPhoneHint {
  const d = nationalDigits.trim();
  if (!d) {
    return { tone: 'neutral', messageKey: 'phoneHintNeutralNational' };
  }
  if (!/^\d+$/.test(d)) {
    return { tone: 'warn', messageKey: 'phoneHintInlineDigitsOnly' };
  }
  if (nationalNumberIncludesCountryCode(countryCode, d)) {
    return { tone: 'warn', messageKey: 'phoneHintNationalHasCountryCode' };
  }
  if (countryCode === '66' && d.startsWith('0')) {
    return { tone: 'tip', messageKey: 'phoneHintThSkipLeadingZero' };
  }
  if (d.length < CHECKOUT_NATIONAL_MIN) {
    return { tone: 'warn', messageKey: 'phoneHintTooShortNational' };
  }
  if (d.length > CHECKOUT_NATIONAL_MAX) {
    return { tone: 'warn', messageKey: 'phoneHintTooLongNational' };
  }
  return { tone: 'success', messageKey: 'phoneHintLooksGood' };
}

export function nationalDigitsValidForCheckout(countryCode: string, nationalDigits: string): boolean {
  return getNationalPhoneHint(countryCode, nationalDigits).tone === 'success';
}

/**
 * After blur: remove country code if pasted into the national box; strip Thai leading 0 from domestic pastes.
 */
export function normalizeNationalPhoneOnBlur(nationalDigits: string, countryCode: string): string {
  let d = nationalDigits.replace(/\D/g, '').slice(0, CHECKOUT_NATIONAL_MAX);
  const cc = countryCode.trim();
  while (cc && d.startsWith(cc) && d.length > cc.length) {
    d = d.slice(cc.length);
  }
  d = d.slice(0, CHECKOUT_NATIONAL_MAX);
  if (countryCode === '66' && d.startsWith('0') && d.length >= 10) {
    d = d.slice(1);
  }
  return d.slice(0, CHECKOUT_NATIONAL_MAX);
}

/** Full-number field: digits only, optional leading + stripped by caller. */
export function getFullPhoneFieldHint(digits: string): FullPhoneHint {
  const d = digits.trim();
  if (!d) {
    return { tone: 'neutral', messageKey: 'phoneHintNeutralFull' };
  }
  if (!/^\d+$/.test(d)) {
    return { tone: 'warn', messageKey: 'phoneHintInlineDigitsOnly' };
  }
  if (thaiFullPhoneHasDuplicateCountryCode(d)) {
    return { tone: 'warn', messageKey: 'phoneHintDuplicateThai66' };
  }
  /** International numbers should not keep a domestic leading 0; nudge until blur strips long pastes. */
  if (d.startsWith('0')) {
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

/** Full single field: strip duplicate leading 66, then Thai domestic leading 0 on long pastes. */
export function normalizeFullPhoneOnBlur(digits: string): string {
  let d = stripDuplicateThaiLeading66(digits).slice(0, FULL_PHONE_MAX);
  if (d.startsWith('0') && d.length >= 10) {
    d = d.slice(1);
  }
  return d.slice(0, FULL_PHONE_MAX);
}
