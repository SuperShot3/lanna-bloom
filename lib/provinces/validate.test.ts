/**
 * Province update validation (Feature 1).
 * Run with: npx tsx lib/provinces/validate.test.ts
 */

import { toPublicProvince, validateProvinceUpdate } from './validate';
import { getProvinceStatusFillColor } from './statusColors';
import { PROVINCE_SEED_ROSTER, slugifyProvinceName } from './seedRoster';

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(msg);
}

// --- seed roster integrity ---
assert(PROVINCE_SEED_ROSTER.length === 76, `expected 76 provinces, got ${PROVINCE_SEED_ROSTER.length}`);
const codes = new Set(PROVINCE_SEED_ROSTER.map((r) => r.province_code));
assert(codes.size === 76, 'province_code must be unique');
const topo = new Set(PROVINCE_SEED_ROSTER.map((r) => r.topojson_property_value));
assert(topo.size === 76, 'topojson_property_value must be unique');

const cm = PROVINCE_SEED_ROSTER.find((r) => r.province_code === 'chiang-mai');
assert(!!cm, 'chiang-mai present');
assert(cm!.destination_id === 'CHIANG_MAI', 'chiang-mai destination');
assert(cm!.status === 'same_day', 'chiang-mai same_day');
assert(cm!.catalog_enabled === true, 'chiang-mai catalog on');

const wired = PROVINCE_SEED_ROSTER.filter((r) => r.destination_id);
assert(wired.length === 6, `expected 6 wired destinations, got ${wired.length}`);

assert(slugifyProvinceName('Bangkok Metropolis') === 'bangkok', 'bangkok slug');
assert(slugifyProvinceName('Chiang Mai') === 'chiang-mai', 'chiang-mai slug');

// --- validation rules ---
const base = { status: 'coming_soon' as const, catalog_enabled: false };

{
  const r = validateProvinceUpdate({ catalog_enabled: true }, base);
  assert(!r.ok, 'reject catalog on coming_soon');
}

{
  const r = validateProvinceUpdate(
    { status: 'same_day', catalog_enabled: true, same_day_cutoff_local: '14:00' },
    base
  );
  assert(r.ok, 'allow same_day + catalog + cutoff');
}

{
  const r = validateProvinceUpdate(
    { same_day_cutoff_local: '14:00' },
    { status: 'next_day', catalog_enabled: true }
  );
  assert(!r.ok, 'reject cutoff on next_day');
}

{
  const r = validateProvinceUpdate(
    { status: 'next_day', same_day_cutoff_local: '14:00' },
    { status: 'same_day', catalog_enabled: true }
  );
  assert(!r.ok, 'reject cutoff when changing away from same_day with cutoff set');
}

{
  const r = validateProvinceUpdate(
    { status: 'next_day' },
    { status: 'same_day', catalog_enabled: true }
  );
  assert(r.ok && r.patch.same_day_cutoff_local === null, 'clear cutoff when leaving same_day');
}

{
  const r = validateProvinceUpdate({ destination_id: 'CHIANG_MAI' }, base);
  assert(!r.ok, 'reject destination_id mutation');
}

{
  const r = validateProvinceUpdate({ same_day_cutoff_local: '9:00' }, {
    status: 'same_day',
    catalog_enabled: true,
  });
  assert(!r.ok, 'reject non HH:MM cutoff');
}

{
  const r = validateProvinceUpdate({ same_day_cutoff_local: '09:00' }, {
    status: 'same_day',
    catalog_enabled: true,
  });
  assert(r.ok, 'accept HH:MM cutoff');
}

// --- public projection strips internal fields ---
{
  const pub = toPublicProvince({
    province_code: 'chiang-rai',
    province_name_en: 'Chiang Rai',
    province_name_th: 'เชียงราย',
    topojson_property_value: 'Chiang Rai',
    status: 'coming_soon',
    catalog_enabled: false,
    min_advance_notice_hours: null,
    same_day_cutoff_local: null,
    customer_message_en: 'Soon',
    customer_message_th: 'เร็วๆ นี้',
    delivery_limitations_en: null,
    delivery_limitations_th: null,
    available_categories: null,
    internal_notes: 'SECRET partner lead',
    destination_id: null,
    seo_page_status: 'not_planned',
  });
  assert(!('internal_notes' in pub), 'internal_notes stripped');
  assert(!('destination_id' in pub), 'destination_id not in public projection');
  assert(pub.customer_message_en === 'Soon', 'message kept');
}

assert(getProvinceStatusFillColor('same_day') !== getProvinceStatusFillColor('coming_soon'), 'colors differ');

console.log('lib/provinces/validate.test.ts: all assertions passed');
