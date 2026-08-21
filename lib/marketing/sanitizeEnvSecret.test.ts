/**
 * Run with: npx tsx lib/marketing/sanitizeEnvSecret.test.ts
 */

import { sanitizeEnvSecret } from './sanitizeEnvSecret';
import { formatGoogleAdsApiError, GOOGLE_ADS_INVALID_GRANT_CODE } from './googleAdsErrors';

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(msg);
}

assert(sanitizeEnvSecret('  abc  ') === 'abc', 'trims whitespace');
assert(sanitizeEnvSecret('"abc"') === 'abc', 'strips double quotes');
assert(sanitizeEnvSecret("'abc'") === 'abc', 'strips single quotes');
assert(sanitizeEnvSecret('1//token\nleftover') === '1//token', 'keeps first line only');
assert(sanitizeEnvSecret('') === undefined, 'empty becomes undefined');
assert(sanitizeEnvSecret(undefined) === undefined, 'undefined stays undefined');

{
  const mapped = formatGoogleAdsApiError(new Error('invalid_grant'));
  assert(mapped.code === GOOGLE_ADS_INVALID_GRANT_CODE, 'maps invalid_grant code');
  assert(mapped.canReconnect === true, 'invalid_grant can reconnect');
  assert(mapped.status === 502, 'invalid_grant is 502');
}

{
  const mapped = formatGoogleAdsApiError({
    response: { data: { error: 'invalid_grant', error_description: 'Token has been expired or revoked.' } },
  });
  assert(mapped.code === GOOGLE_ADS_INVALID_GRANT_CODE, 'maps nested invalid_grant');
}

{
  const mapped = formatGoogleAdsApiError(new Error('CUSTOMER_NOT_FOUND'));
  assert(mapped.canReconnect === false, 'other errors are not reconnectable');
  assert(mapped.message.includes('CUSTOMER_NOT_FOUND'), 'keeps original message');
}

console.log('sanitizeEnvSecret + googleAdsErrors tests passed');
