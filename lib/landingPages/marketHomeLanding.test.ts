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
  buildExperienceCopy,
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

const phuketDistricts = getMarketLandingDistricts('PHUKET');
assert.equal(phuketDistricts.length, 11, 'Phuket has 11 named checkout areas');
assert.ok(
  formatDistrictList(phuketDistricts, 'en').includes('Patong'),
  'Phuket district list includes Patong'
);

const krabiDistricts = getMarketLandingDistricts('KRABI');
assert.equal(krabiDistricts.length, 6, 'Krabi has 6 named checkout areas');
assert.ok(
  formatDistrictList(krabiDistricts, 'en').includes('Ao Nang'),
  'Krabi district list includes Ao Nang'
);

const huaHinDistricts = getMarketLandingDistricts('HUA_HIN');
assert.equal(huaHinDistricts.length, 6, 'Hua Hin has 6 named checkout areas');
assert.ok(
  formatDistrictList(huaHinDistricts, 'en').includes('Hua Hin Center'),
  'Hua Hin district list includes Hua Hin Center'
);

const samuiDistricts = getMarketLandingDistricts('SAMUI');
assert.equal(samuiDistricts.length, 8, 'Samui has 8 named checkout areas');
assert.ok(
  formatDistrictList(samuiDistricts, 'en').includes('Chaweng'),
  'Samui district list includes Chaweng'
);

const bangkokDistricts = getMarketLandingDistricts('BANGKOK');
assert.equal(bangkokDistricts.length, 10, 'Bangkok has 10 named checkout areas');
assert.ok(
  formatDistrictList(bangkokDistricts, 'en').includes('Sukhumvit'),
  'Bangkok district list includes Sukhumvit'
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
assert.ok(
  lamphunFaq.some((item) => /delivery from/i.test(item.a) && item.a.includes('250')),
  'Lamphun FAQ mentions delivery from min fee'
);
assert.ok(
  !lamphunFaq.some((item) => item.a.includes('{amount}')),
  'Lamphun FAQ amount placeholder filled'
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

const chiangMaiExperience = buildExperienceCopy({
  lang: 'en',
  city: 'Chiang Mai',
  timing: 'same_day',
});
assert.match(chiangMaiExperience.subtitle, /Chiang Mai/);
assert.match(chiangMaiExperience.step1Desc, /Chiang Mai/);
assert.match(chiangMaiExperience.step3Desc, /same-day/i);
assert.ok(chiangMaiExperience.step3Desc.includes('20:00'), 'Chiang Mai same-day mentions 20:00 cutoff');
assert.ok(!chiangMaiExperience.step3Desc.includes('{cutoff}'));
assert.ok(!chiangMaiExperience.subtitle.includes('{city}'));

const lamphunExperience = buildExperienceCopy({
  lang: 'en',
  city: 'Lamphun',
  timing: 'same_day',
});
assert.match(lamphunExperience.subtitle, /Lamphun/);
assert.match(lamphunExperience.step1Desc, /Lamphun/);
assert.match(lamphunExperience.step3Desc, /same-day/i);
assert.ok(lamphunExperience.step3Desc.includes('20:00'), 'Lamphun same-day mentions 20:00 cutoff');
assert.ok(!lamphunExperience.step3Desc.includes('Chiang Mai'));

const pattayaExperience = buildExperienceCopy({
  lang: 'en',
  city: 'Pattaya',
  timing: 'same_day',
});
assert.match(pattayaExperience.subtitle, /Pattaya/);
assert.match(pattayaExperience.step1Desc, /Pattaya/);
assert.ok(!pattayaExperience.subtitle.includes('Chiang Mai'));
assert.ok(!pattayaExperience.step1Desc.includes('Chiang Mai'));
assert.ok(!pattayaExperience.step3Desc.includes('Chiang Mai'));

const preorderExperience = buildExperienceCopy({
  lang: 'en',
  city: 'Chiang Rai',
  timing: 'preorder_only',
});
assert.match(preorderExperience.step3Desc, /Advance order for Chiang Rai/);
assert.ok(!/same-day/i.test(preorderExperience.step3Desc));

console.log('marketHomeLanding.test.ts: ok');
