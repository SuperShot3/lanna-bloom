/**
 * Partner auth identity is the shop phone number.
 * Supabase Auth still needs an email, so we map phone → a synthetic address.
 * Contact email on the application (if any) is optional and is not used to log in.
 */

export const PARTNER_PHONE_LOGIN_DOMAIN = 'partner-phone.lannabloom.shop';

/** Digits-only canonical phone used for login (Thai 0-prefix → 66). */
export function normalizePartnerLoginPhone(raw: string): string | null {
  let digits = raw.replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (!digits) return null;

  if (digits.startsWith('0')) {
    digits = `66${digits.slice(1)}`;
  }

  if (digits.length < 8 || digits.length > 15) return null;
  return digits;
}

export function partnerAuthEmailFromPhone(raw: string): string | null {
  const canonical = normalizePartnerLoginPhone(raw);
  if (!canonical) return null;
  return `${canonical}@${PARTNER_PHONE_LOGIN_DOMAIN}`;
}

export function isPartnerPhoneLoginEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return email.trim().toLowerCase().endsWith(`@${PARTNER_PHONE_LOGIN_DOMAIN}`);
}

/** Thai-local display (0XXXXXXXXX) when the number is a 66… mobile/landline. */
export function displayPartnerLoginPhone(raw: string): string {
  const canonical = normalizePartnerLoginPhone(raw);
  if (!canonical) return raw.trim();
  if (canonical.startsWith('66') && canonical.length >= 10) {
    return `0${canonical.slice(2)}`;
  }
  return canonical;
}
