/**
 * Partner phone-login helpers.
 * Run with: npx tsx lib/partnerLogin.test.ts
 */

import {
  displayPartnerLoginPhone,
  isPartnerPhoneLoginEmail,
  normalizePartnerLoginPhone,
  partnerAuthEmailFromPhone,
  PARTNER_PHONE_LOGIN_DOMAIN,
} from './partnerLogin';

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(msg);
}

assert(normalizePartnerLoginPhone('0812345678') === '66812345678', 'local 0-prefix');
assert(normalizePartnerLoginPhone('081-234-5678') === '66812345678', 'dashes');
assert(normalizePartnerLoginPhone('+66 81 234 5678') === '66812345678', 'e164');
assert(normalizePartnerLoginPhone('66812345678') === '66812345678', 'already canonical');
assert(normalizePartnerLoginPhone('0066812345678') === '66812345678', '00 international prefix');
assert(normalizePartnerLoginPhone('') === null, 'empty');
assert(normalizePartnerLoginPhone('123') === null, 'too short');

assert(
  partnerAuthEmailFromPhone('0812345678') === `66812345678@${PARTNER_PHONE_LOGIN_DOMAIN}`,
  'auth email from local phone'
);
assert(partnerAuthEmailFromPhone('12') === null, 'auth email rejects short');

assert(displayPartnerLoginPhone('0812345678') === '0812345678', 'display local');
assert(displayPartnerLoginPhone('+66812345678') === '0812345678', 'display from e164');

assert(isPartnerPhoneLoginEmail(`66812345678@${PARTNER_PHONE_LOGIN_DOMAIN}`), 'synthetic email');
assert(!isPartnerPhoneLoginEmail('shop@gmail.com'), 'real email is not phone-login');
assert(!isPartnerPhoneLoginEmail(null), 'null email');

console.log('partnerLogin.test.ts: all assertions passed');
