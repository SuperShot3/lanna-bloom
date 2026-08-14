/**
 * Market homepage copy helpers.
 * Run: npx tsx lib/landingPages/marketHomeLanding.test.ts
 */
import assert from 'node:assert/strict';
import {
  fillCityPlaceholders,
  formatDistrictList,
  getMarketHomeFaqItems,
  getMarketLandingDistricts,
  timingFromProvinceStatus,
  buildMarketDeliveryCopy,
} from './marketHomeLanding';

assert.equal(
  fillCityPlaceholders('Flower delivery in {city}', 'Pattaya'),
  'Flower delivery in Pattaya'
);
assert.equal(
  fillCityPlaceholders('We deliver across {city} — including {areas}.', 'Lamphun', 'Mueang Lamphun'),
  'We deliver across Lamphun — including Mueang Lamphun.'
);

assert.equal(timingFromProvinceStatus('same_day'), 'same_day');
assert.equal(timingFromProvinceStatus('next_day'), 'next_day');
assert.equal(timingFromProvinceStatus('preorder_only'), 'preorder_only');
assert.equal(timingFromProvinceStatus('coming_soon'), 'other');

const pattayaDistricts = getMarketLandingDistricts('PATTAYA');
assert.ok(pattayaDistricts.length > 0, 'Pattaya has named districts');
assert.ok(
  formatDistrictList(pattayaDistricts, 'en').includes('Pattaya'),
  'Pattaya district list includes Pattaya'
);

const lamphunFaq = getMarketHomeFaqItems({
  lang: 'en',
  city: 'Lamphun',
  destinationId: 'LAMPHUN',
  province: {
    province_code: 'lamphun',
    province_name_en: 'Lamphun',
    province_name_th: 'ลำพูน',
    topojson_property_value: 'Lamphun',
    status: 'next_day',
    catalog_enabled: true,
    min_advance_notice_hours: null,
    same_day_cutoff_local: null,
    customer_message_en: 'Next-day flower delivery across Lamphun.',
    customer_message_th: null,
    delivery_limitations_en: null,
    delivery_limitations_th: null,
    available_categories: ['flowers'],
  },
});
assert.ok(
  lamphunFaq.some((item) => /next-day/i.test(item.q) || /next-day/i.test(item.a)),
  'Lamphun FAQ mentions next-day'
);
assert.ok(
  !lamphunFaq.some((item) => /same-day flower delivery\?/i.test(item.q)),
  'Lamphun FAQ does not ask the same-day question'
);

const lamphunDelivery = buildMarketDeliveryCopy({
  lang: 'en',
  city: 'Lamphun',
  destinationId: 'LAMPHUN',
  province: {
    province_code: 'lamphun',
    province_name_en: 'Lamphun',
    province_name_th: 'ลำพูน',
    topojson_property_value: 'Lamphun',
    status: 'next_day',
    catalog_enabled: true,
    min_advance_notice_hours: null,
    same_day_cutoff_local: null,
    customer_message_en: null,
    customer_message_th: null,
    delivery_limitations_en: null,
    delivery_limitations_th: null,
    available_categories: ['flowers'],
  },
});
assert.equal(lamphunDelivery.showCutoffWindow, false);
assert.equal(lamphunDelivery.showLocalCourierBrands, false);
assert.match(lamphunDelivery.timingTitle, /next-day/i);
assert.match(lamphunDelivery.title, /Lamphun/);

const pattayaDelivery = buildMarketDeliveryCopy({
  lang: 'en',
  city: 'Pattaya',
  destinationId: 'PATTAYA',
  province: {
    province_code: 'chon-buri',
    province_name_en: 'Chon Buri',
    province_name_th: 'ชลบุรี',
    topojson_property_value: 'Chon Buri',
    status: 'same_day',
    catalog_enabled: true,
    min_advance_notice_hours: null,
    same_day_cutoff_local: null,
    customer_message_en: null,
    customer_message_th: null,
    delivery_limitations_en: null,
    delivery_limitations_th: null,
    available_categories: ['flowers'],
  },
});
assert.equal(pattayaDelivery.showCutoffWindow, true);
assert.match(pattayaDelivery.timingTitle, /same-day/i);

console.log('marketHomeLanding.test.ts: ok');
