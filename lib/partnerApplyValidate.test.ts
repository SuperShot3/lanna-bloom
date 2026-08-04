/**
 * Partner apply validation (Feature 2).
 * Run with: npx tsx lib/partnerApplyValidate.test.ts
 */

import {
  hasAtLeastOneContactMethod,
  validatePartnerApplyFields,
} from './partnerApplyValidate';

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(msg);
}

const base = {
  shopName: 'Lanna Flowers',
  provinceCode: 'chiang-mai',
  phone: '',
  lineId: '',
  email: '',
  experienceNote: '',
};

assert(hasAtLeastOneContactMethod({ phone: '0812345678' }), 'phone alone ok');
assert(hasAtLeastOneContactMethod({ lineId: '@shop' }), 'line alone ok');
assert(hasAtLeastOneContactMethod({ email: 'a@b.com' }), 'email alone ok');
assert(!hasAtLeastOneContactMethod({}), 'empty contacts fail');
assert(!hasAtLeastOneContactMethod({ phone: '  ', lineId: '', email: '' }), 'whitespace fail');

{
  const r = validatePartnerApplyFields({ ...base, shopName: '' }, { provinceExists: true });
  assert(!r.ok, 'reject empty shop name');
}

{
  const r = validatePartnerApplyFields({ ...base, provinceCode: '' }, { provinceExists: true });
  assert(!r.ok, 'reject empty province');
}

{
  const r = validatePartnerApplyFields(base, { provinceExists: false });
  assert(!r.ok, 'reject unknown province');
}

{
  const r = validatePartnerApplyFields(base, { provinceExists: true });
  assert(!r.ok, 'reject no contact method');
}

{
  const r = validatePartnerApplyFields(
    { ...base, phone: '0812345678' },
    { provinceExists: true }
  );
  assert(r.ok && r.data.phone === '0812345678', 'accept phone-only');
}

{
  const r = validatePartnerApplyFields(
    { ...base, lineId: ' @shop ', email: '  a@b.com  ', shopName: '  Shop  ' },
    { provinceExists: true }
  );
  assert(
    r.ok &&
      r.data.shopName === 'Shop' &&
      r.data.lineId === '@shop' &&
      r.data.email === 'a@b.com',
    'trim fields on success'
  );
}

console.log('partnerApplyValidate.test.ts: all assertions passed');
