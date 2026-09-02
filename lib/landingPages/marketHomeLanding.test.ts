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
  buildMarketLocalCopy,
  buildMarketLocalLinks,
  buildExperienceCopy,
} from './marketHomeLanding';
import { buildHeroTrustLine } from './heroTrustLine';
import { getActiveMarkets } from '@/lib/delivery/markets';
import type { PublicProvince } from '@/lib/provinces/types';
import {
  getCityNeutralFeaturedQuote,
  reviewMentionsForeignCity,
} from '@/lib/reviews';

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

const paiDistricts = getMarketLandingDistricts('PAI');
assert.equal(paiDistricts.length, 7, 'Pai has 7 named checkout areas');
assert.ok(
  formatDistrictList(paiDistricts, 'en').includes('Wiang Tai'),
  'Pai district list includes Wiang Tai'
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

const lamphunNextDayExperience = buildExperienceCopy({
  lang: 'en',
  city: 'Lamphun',
  timing: 'next_day',
});
assert.match(lamphunNextDayExperience.step3Desc, /Next-day delivery in Lamphun/);
assert.match(lamphunNextDayExperience.step3Desc, /Same-day is not available/i);
assert.ok(!lamphunNextDayExperience.step3Desc.includes('Chiang Mai'));

const phuketZhTrust = buildHeroTrustLine({
  lang: 'zh-hk',
  city: 'Phuket',
  timing: 'same_day',
});
assert.equal(phuketZhTrust, 'Phuket即日配送');
assert.ok(!phuketZhTrust.includes('清邁'));

const lamphunZhTrust = buildHeroTrustLine({
  lang: 'zh-hk',
  city: 'Lamphun',
  timing: 'next_day',
});
assert.equal(lamphunZhTrust, 'Lamphun翌日配送');
assert.ok(!lamphunZhTrust.includes('清邁'));
assert.ok(!lamphunZhTrust.includes('即日'));

const chiangMaiZhTrust = buildHeroTrustLine({
  lang: 'zh-hk',
  city: '清邁',
  timing: 'same_day',
});
assert.equal(chiangMaiZhTrust, '清邁即日配送');

const phuketLinks = buildMarketLocalLinks({
  lang: 'en',
  city: 'Phuket',
  destinationId: 'PHUKET',
  catalogHref: '/en/catalog/phuket',
});
assert.ok(
  phuketLinks.some((l) => l.href.includes('/info/flower-delivery-phuket')),
  'Phuket landing links its own guide'
);
assert.ok(
  !phuketLinks.some((l) => l.href.includes('chiang-mai')),
  'Phuket landing does not link a Chiang Mai article'
);

const krabiLinks = buildMarketLocalLinks({
  lang: 'en',
  city: 'Krabi / Ao Nang',
  destinationId: 'KRABI',
  catalogHref: '/en/catalog/krabi',
});
assert.ok(
  !krabiLinks.some((l) => l.href.includes('/info/')),
  'Krabi has no city info article yet'
);
assert.ok(!krabiLinks.some((l) => l.href.includes('chiang-mai')));
assert.equal(krabiLinks.length, 2);

const FOREIGN_CITY_NEEDLES = [
  'Chiang Mai',
  'เชียงใหม่',
  '清邁',
  'Bangkok',
  'กรุงเทพ',
  'Pattaya',
  'พัทยา',
  'Phuket',
  'ภูเก็ต',
  'Krabi',
  'กระบี่',
  'Ao Nang',
  'อ่าวนาง',
  'Koh Samui',
  'เกาะสมุย',
  'Hua Hin',
  'หัวหิน',
  'Lamphun',
  'ลำพูน',
  'Pai',
  'ปาย',
];

function blobHasNeedle(blob: string, needle: string): boolean {
  if (needle.length <= 3) {
    const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`(?:^|[^\\p{L}])${escaped}(?:$|[^\\p{L}])`, 'iu');
    return pattern.test(blob);
  }
  return blob.toLowerCase().includes(needle.toLowerCase());
}

function needleBelongsToCity(needle: string, cityEn: string, cityTh: string): boolean {
  const n = needle.toLowerCase();
  const en = cityEn.toLowerCase();
  const th = cityTh.toLowerCase();
  return en.includes(n) || th.includes(n) || n.includes(en) || n.includes(th);
}

function mockProvince(status: PublicProvince['status']): PublicProvince {
  return {
    province_code: 'mock',
    province_name_en: 'Mock',
    province_name_th: 'ม็อก',
    topojson_property_value: 'Mock',
    status,
    catalog_enabled: true,
    min_advance_notice_hours: null,
    same_day_cutoff_local: null,
    customer_message_en: null,
    customer_message_th: null,
    delivery_limitations_en: null,
    delivery_limitations_th: null,
    available_categories: ['flowers'],
  };
}

for (const market of getActiveMarkets()) {
  const timing = market.destinationId === 'LAMPHUN' ? 'next_day' : 'same_day';
  const province = mockProvince(timing);
  for (const lang of ['en', 'th', 'zh-hk'] as const) {
    const city = lang === 'th' ? market.customerFacingNameTh : market.customerFacingNameEn;
    const delivery = buildMarketDeliveryCopy({
      lang,
      city,
      destinationId: market.destinationId,
      province,
    });
    const local = buildMarketLocalCopy({
      lang,
      city,
      destinationId: market.destinationId,
      catalogHref: `/${lang}/catalog/${market.pathSlug}`,
    });
    const faq = getMarketHomeFaqItems({
      lang,
      city,
      destinationId: market.destinationId,
      province,
    });
    const experience = buildExperienceCopy({ lang, city, timing });
    const trust = buildHeroTrustLine({ lang, city, timing });
    const blob = JSON.stringify({ delivery, local, faq, experience, trust });
    assert.ok(!blob.includes('{city}'), `${market.pathSlug} ${lang} has unfilled {city}`);
    for (const needle of FOREIGN_CITY_NEEDLES) {
      if (needleBelongsToCity(needle, market.customerFacingNameEn, market.customerFacingNameTh)) {
        continue;
      }
      assert.ok(
        !blobHasNeedle(blob, needle),
        `${market.pathSlug} ${lang} copy must not mention ${needle}`
      );
    }
  }
}

assert.ok(
  reviewMentionsForeignCity(
    { text: 'Best flower delivery experience in Chiang Mai.', location: 'Nimman' },
    'PHUKET'
  )
);
assert.ok(
  !reviewMentionsForeignCity(
    { text: 'Arrived fresh at the hotel.', location: 'Patong, Phuket' },
    'PHUKET'
  )
);
const phuketQuote = getCityNeutralFeaturedQuote('PHUKET');
assert.ok(!/chiang mai|เชียงใหม่|清邁/i.test(phuketQuote));

console.log('marketHomeLanding.test.ts: ok');
