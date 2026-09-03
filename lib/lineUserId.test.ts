/**
 * LINE ID helpers for checkout (typed ID vs phone-as-ID).
 * Run with: npx tsx lib/lineUserId.test.ts
 */

import {
  effectiveCheckoutLineId,
  isValidLineUserId,
  lineIdFromPhone,
  lineIdMatchesPhone,
  normalizeLineUserId,
} from './lineUserId';

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(msg);
}

{
  const id = lineIdFromPhone('66', '812345678');
  assert(id === '0812345678', 'Thai national without 0 gets leading 0');
  assert(isValidLineUserId(id), 'Thai derived ID is valid');
}

{
  const id = lineIdFromPhone('66', '0812345678');
  assert(id === '0812345678', 'Thai national that already has 0 is unchanged');
}

{
  assert(lineIdFromPhone('66', '') === '', 'empty phone yields empty ID');
  assert(lineIdFromPhone('66', '   ') === '', 'whitespace phone yields empty ID');
}

{
  const id = lineIdFromPhone('1', '2025551234');
  assert(id === '2025551234', 'non-TH uses national digits as typed');
  assert(isValidLineUserId(id), 'US digits are a valid LINE ID shape');
}

{
  const id = lineIdFromPhone('+66', '81 234 5678');
  assert(id === '0812345678', 'strips non-digits and still prefixes Thai 0');
}

{
  assert(
    effectiveCheckoutLineId({
      useLineIdFromPhone: true,
      lineId: 'CustomName',
      countryCode: '66',
      phoneNational: '812345678',
    }) === '0812345678',
    'phone flag wins over typed ID'
  );
  assert(
    effectiveCheckoutLineId({
      useLineIdFromPhone: false,
      lineId: 'CustomName',
      countryCode: '66',
      phoneNational: '812345678',
    }) === 'CustomName',
    'typed ID used when flag is off'
  );
}

{
  assert(
    lineIdMatchesPhone('0812345678', '66', '812345678'),
    'derived Thai ID matches phone'
  );
  assert(
    !lineIdMatchesPhone('CustomName', '66', '812345678'),
    'custom ID does not match phone'
  );
  assert(
    lineIdMatchesPhone(' 0812345678 ', '66', '812345678'),
    'normalize before compare'
  );
  assert(normalizeLineUserId('@0812345678') === '0812345678', 'strips leading @');
}

console.log('lineUserId.test.ts: ok');
