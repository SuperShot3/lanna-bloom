/**
 * Simple assertions for delivery fee rules.
 * Run with: npx tsx lib/deliveryFees.test.ts (or add to test script).
 */

import { calcDeliveryFeeTHB, detectDistrictFromAddress, DISTRICTS } from './deliveryFees';
import {
  resolveAmphoeFeeDisplay,
  resolveOtherAmphoeFeeDisplay,
} from './delivery/amphoeDisplayFees';
import { AMPHOE_MAP_DISTRICTS } from './delivery/amphoeMapData';
import { CHON_BURI_AMPHOE_MAP_DISTRICTS } from './delivery/chonBuriAmphoeMapData';
import { PHUKET_AMPHOE_MAP_DISTRICTS } from './delivery/phuketAmphoeMapData';
import { PRACHUAP_KHIRI_KHAN_AMPHOE_MAP_DISTRICTS } from './delivery/prachuapKhiriKhanAmphoeMapData';
import { KRABI_AMPHOE_MAP_DISTRICTS } from './delivery/krabiAmphoeMapData';
import { SURAT_THANI_AMPHOE_MAP_DISTRICTS } from './delivery/suratThaniAmphoeMapData';
import { BANGKOK_AMPHOE_MAP_DISTRICTS } from './delivery/bangkokAmphoeMapData';
import { destinationIdForAmphoeProvince } from './delivery/amphoeProvinces';
import { getDeliveryDistanceTiers } from './delivery/distanceTiers';
import {
  detectChiangMaiZoneFromAddress,
  getCheckoutZonesForDestination,
  getChiangMaiZoneFeeLadder,
  getZoneFee,
  getZonesForDestination,
} from './delivery/zones';
import { getAmphoeDrillItems } from './delivery/amphoeMapDrilldown';

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(msg);
}

// Mueang Chiang Mai
assert(calcDeliveryFeeTHB({ district: 'MUEANG', isMueangCentral: true }) === 250, 'Mueang central = 250');
assert(calcDeliveryFeeTHB({ district: 'MUEANG', isMueangCentral: false }) === 350, 'Mueang non-central = 350');

// 400 THB districts
assert(calcDeliveryFeeTHB({ district: 'SARAPHI', isMueangCentral: false }) === 400, 'Saraphi = 400');
assert(calcDeliveryFeeTHB({ district: 'SAN_SAI', isMueangCentral: false }) === 400, 'San Sai = 400');

// 450 THB districts
assert(calcDeliveryFeeTHB({ district: 'HANG_DONG', isMueangCentral: false }) === 450, 'Hang Dong = 450');
assert(calcDeliveryFeeTHB({ district: 'SAN_KAMPHAENG', isMueangCentral: false }) === 450, 'San Kamphaeng = 450');
assert(calcDeliveryFeeTHB({ district: 'MAE_RIM', isMueangCentral: false }) === 450, 'Mae Rim = 450');

// 550 THB districts
assert(calcDeliveryFeeTHB({ district: 'DOI_SAKET', isMueangCentral: false }) === 550, 'Doi Saket = 550');
assert(calcDeliveryFeeTHB({ district: 'SAN_PA_TONG', isMueangCentral: false }) === 550, 'San Pa Tong = 550');

// Retired CM Lamphun satellite → unknown fee; Lamphun is its own destination
assert(calcDeliveryFeeTHB({ district: 'LAMPHUN', isMueangCentral: false }) === 550, 'Legacy Lamphun district = 550');
assert(calcDeliveryFeeTHB({ district: 'MAE_ON', isMueangCentral: false }) === 750, 'Mae On = 750');
assert(calcDeliveryFeeTHB({ district: 'MAE_WANG', isMueangCentral: false }) === 750, 'Mae Wang = 750');
assert(calcDeliveryFeeTHB({ district: 'MAE_TAENG', isMueangCentral: false }) === 850, 'Mae Taeng = 850');
assert(calcDeliveryFeeTHB({ district: 'SAMOENG', isMueangCentral: false }) === 950, 'Samoeng = 950');
assert(calcDeliveryFeeTHB({ district: 'CHIANG_DAO', isMueangCentral: false }) === 950, 'Chiang Dao = 950');
assert(calcDeliveryFeeTHB({ district: 'UNKNOWN', isMueangCentral: false }) === 550, 'Unknown = 550');

// Auto-detect
assert(detectDistrictFromAddress('123 Nimman Road') === 'MUEANG', 'Nimman -> Mueang');
assert(detectDistrictFromAddress('หางดง') === 'HANG_DONG', 'Thai Hang Dong');
assert(detectDistrictFromAddress('อ.สันกำแพง') === 'SAN_KAMPHAENG', 'Thai San Kamphaeng');
assert(detectDistrictFromAddress('Mueang Lamphun') === null, 'Lamphun no longer CM district');
assert(detectDistrictFromAddress('สันป่าตอง') === 'SAN_PA_TONG', 'Thai San Pa Tong');
assert(detectDistrictFromAddress('random address') === null, 'No match -> null');

// Chiang Mai zone detection (tambon / locality)
assert(detectChiangMaiZoneFromAddress('123 Chang Phueak Road') === 'cm-chang-phueak', 'Chang Phueak zone');
assert(detectChiangMaiZoneFromAddress('Suthep, Chiang Mai') === 'cm-suthep', 'Suthep zone');
assert(detectChiangMaiZoneFromAddress('หนองป่าคร้าง') === 'cm-nong-pa-khrang', 'Nong Pa Khrang zone');
assert(detectChiangMaiZoneFromAddress('Nong Chom, Chiang Mai') === 'cm-nong-chom', 'Nong Chom zone');
assert(detectChiangMaiZoneFromAddress('Mae Hia, Hang Dong') === 'cm-mae-hia', 'Mae Hia zone');
assert(detectChiangMaiZoneFromAddress('Don Kaeo, Chiang Mai') === 'cm-don-kaeo', 'Don Kaeo zone');
assert(getZoneFee('CHIANG_MAI', 'cm-suthep') === 300, 'Suthep fee = 300');
assert(getZoneFee('CHIANG_MAI', 'cm-nong-chom') === 350, 'Nong Chom fee = 350');
assert(getZoneFee('CHIANG_MAI', 'cm-mae-hia') === 350, 'Mae Hia fee = 350');
assert(getZoneFee('CHIANG_MAI', 'cm-don-kaeo') === 400, 'Don Kaeo fee = 400');
assert(getZoneFee('CHIANG_MAI', 'cm-samoeng') === 950, 'Samoeng fee = 950');
assert(getZoneFee('CHIANG_MAI', 'cm-lamphun') === null, 'CM Lamphun zone removed');
assert(getZoneFee('LAMPHUN', 'lp-mueang-lamphun') === 250, 'Lamphun Mueang fee = 250');
assert(getZoneFee('LAMPHUN', 'lp-pa-sang') === 300, 'Lamphun Pa Sang fee = 300');
assert(getZoneFee('LAMPHUN', 'lp-ban-thi') === 300, 'Lamphun Ban Thi fee = 300');
assert(getZoneFee('LAMPHUN', 'lp-wiang-nong-long') === 300, 'Lamphun Wiang Nong Long fee = 300');
assert(getZoneFee('LAMPHUN', 'lp-mae-tha') === 350, 'Lamphun Mae Tha fee = 350');
assert(getZoneFee('LAMPHUN', 'lp-ban-hong') === 400, 'Lamphun Ban Hong fee = 400');
assert(getZoneFee('LAMPHUN', 'lp-li') === 450, 'Lamphun Li fee = 450');
assert(getZoneFee('LAMPHUN', 'lp-thung-hua-chang') === 550, 'Lamphun Thung Hua Chang fee = 550');
assert(getZonesForDestination('LAMPHUN').length === 8, 'Lamphun has 8 amphoe zones');
assert(getZonesForDestination('CHIANG_MAI').length === 23, 'Chiang Mai has 23 zones');
assert(getCheckoutZonesForDestination('CHIANG_MAI').length === 21, 'Checkout excludes manual-quote zones');
assert(getZonesForDestination('PATTAYA').length === 7, 'Pattaya has 7 checkout zones');
assert(getZoneFee('PATTAYA', 'pat-central-pattaya') === 250, 'Pattaya Central fee = 250');
assert(getZoneFee('PATTAYA', 'pat-na-jomtien') === 350, 'Pattaya Na Jomtien fee = 350');
assert(getZoneFee('PATTAYA', 'pat-east-nong-prue') === 350, 'Pattaya East / Nong Prue fee = 350');
assert(destinationIdForAmphoeProvince('chon-buri') === 'PATTAYA', 'chon-buri amphoe destination is PATTAYA');
assert(destinationIdForAmphoeProvince('lamphun') === 'LAMPHUN', 'lamphun amphoe destination is LAMPHUN');
assert(destinationIdForAmphoeProvince('chiang-mai') === 'CHIANG_MAI', 'chiang-mai amphoe destination is CHIANG_MAI');
assert(destinationIdForAmphoeProvince('phuket') === 'PHUKET', 'phuket amphoe destination is PHUKET');
assert(destinationIdForAmphoeProvince('prachuap-khiri-khan') === 'HUA_HIN', 'prachuap amphoe destination is HUA_HIN');
assert(destinationIdForAmphoeProvince('krabi') === 'KRABI', 'krabi amphoe destination is KRABI');
assert(destinationIdForAmphoeProvince('surat-thani') === 'SAMUI', 'surat-thani amphoe destination is SAMUI');
assert(destinationIdForAmphoeProvince('bangkok') === 'BANGKOK', 'bangkok amphoe destination is BANGKOK');
assert(getZonesForDestination('BANGKOK').length === 10, 'Bangkok has 10 checkout zones');
assert(getZoneFee('BANGKOK', 'bkk-old-city') === 250, 'Bangkok Old City fee = 250');
assert(getZoneFee('BANGKOK', 'bkk-thonburi-west') === 400, 'Bangkok Thonburi west fee = 400');
assert(getZonesForDestination('PHUKET').length === 11, 'Phuket has 11 checkout zones');
assert(getZoneFee('PHUKET', 'hkt-phuket-town') === 250, 'Phuket Town fee = 250');
assert(getZoneFee('PHUKET', 'hkt-mai-khao-airport-sakhu') === 550, 'Phuket Mai Khao fee = 550');
assert(getZonesForDestination('KRABI').length === 5, 'Krabi has 5 checkout zones');
assert(getZoneFee('KRABI', 'kbn-ao-nang-center') === 250, 'Ao Nang Center fee = 250');
assert(getZoneFee('KRABI', 'kbn-tubkaek') === 450, 'Tubkaek fee = 450');

// Districts array
assert(DISTRICTS.length >= 10, 'DISTRICTS has options');

// Map amphoe metadata covers all OpenGIS Chiang Mai amphoes (amp_code join keys)
assert(AMPHOE_MAP_DISTRICTS.length === 25, 'Chiang Mai map has 25 amphoes');
const ampCodes = new Set(AMPHOE_MAP_DISTRICTS.map((d) => d.ampCode));
assert(ampCodes.size === 25, 'each amphoe has a unique OpenGIS amp_code');
for (const d of AMPHOE_MAP_DISTRICTS) {
  assert(/^\d{4}$/.test(d.ampCode), `${d.id} ampCode should be 4 digits`);
}

// Map amphoe display fees derive from zones.ts
for (const d of AMPHOE_MAP_DISTRICTS) {
  const display = resolveAmphoeFeeDisplay(d);
  if (d.manualQuote) {
    assert(display.displayKind === 'driver_confirm', `${d.id} should be driver_confirm`);
    assert(d.checkoutZoneId != null, `${d.id} should link estimate zone`);
    assert(
      display.feeFrom === getZoneFee('CHIANG_MAI', d.checkoutZoneId!),
      `${d.id} estimate should match zone fee`
    );
    continue;
  }
  assert(display.displayKind === 'checkout', `${d.id} should be checkout-backed`);
  assert(d.checkoutZoneId != null, `${d.id} needs checkoutZoneId`);
  const zoneIds = d.relatedCheckoutZoneIds?.length
    ? d.relatedCheckoutZoneIds
    : [d.checkoutZoneId!];
  const fees = zoneIds.map((id) => getZoneFee('CHIANG_MAI', id)!);
  assert(display.feeFrom === Math.min(...fees), `${d.id} feeFrom matches min zone fee`);
  assert(
    display.feeTo === Math.max(...fees) || (fees.length === 1 && display.feeTo === display.feeFrom),
    `${d.id} feeTo matches max zone fee`
  );
}

const otherDisplay = resolveOtherAmphoeFeeDisplay();
assert(otherDisplay.displayKind === 'driver_confirm', 'other is driver_confirm');
assert(otherDisplay.feeFrom === getZoneFee('CHIANG_MAI', 'cm-unknown'), 'other estimate = cm-unknown');

assert(CHON_BURI_AMPHOE_MAP_DISTRICTS.length === 7, 'Chon Buri map has 7 Pattaya areas');
const pattayaAmpCodes = new Set(CHON_BURI_AMPHOE_MAP_DISTRICTS.map((d) => d.ampCode));
assert(pattayaAmpCodes.size === 7, 'each Pattaya area has a unique amp_code');
for (const d of CHON_BURI_AMPHOE_MAP_DISTRICTS) {
  assert(d.checkoutZoneId != null, `${d.id} needs checkoutZoneId`);
  const display = resolveAmphoeFeeDisplay(d, 'PATTAYA');
  assert(display.displayKind === 'checkout', `${d.id} should be checkout-backed`);
  assert(
    display.feeFrom === getZoneFee('PATTAYA', d.checkoutZoneId!),
    `${d.id} fee matches Pattaya zone`
  );
}
const centralDisplay = resolveAmphoeFeeDisplay(
  CHON_BURI_AMPHOE_MAP_DISTRICTS.find((d) => d.id === 'central-pattaya')!,
  'PATTAYA'
);
const naJomtienDisplay = resolveAmphoeFeeDisplay(
  CHON_BURI_AMPHOE_MAP_DISTRICTS.find((d) => d.id === 'na-jomtien')!,
  'PATTAYA'
);
assert(centralDisplay.feeFrom === 250, 'Central Pattaya feeFrom = 250');
assert(naJomtienDisplay.feeFrom === 350, 'Na Jomtien feeFrom = 350');

const pattayaDrill = getAmphoeDrillItems('chon-buri', 'en');
assert(pattayaDrill.length === 7, 'Chon Buri drill has 7 Pattaya areas');
assert(
  pattayaDrill.every((d) => d.subAreas.length === 0),
  'Pattaya areas are first-class map districts, not nested rows'
);

const lamphunDrill = getAmphoeDrillItems('lamphun', 'en');
assert(lamphunDrill.length === 8, 'Lamphun drill has 8 amphoes');
assert(
  lamphunDrill.every((d) => d.subAreas.length === 0),
  'Lamphun amphoes have no nested checkout areas'
);

assert(PHUKET_AMPHOE_MAP_DISTRICTS.length === 11, 'Phuket map has 11 checkout areas');
const phuketAmpCodes = new Set(PHUKET_AMPHOE_MAP_DISTRICTS.map((d) => d.ampCode));
assert(phuketAmpCodes.size === 11, 'each Phuket area has a unique amp_code');
for (const d of PHUKET_AMPHOE_MAP_DISTRICTS) {
  assert(d.checkoutZoneId != null, `${d.id} needs checkoutZoneId`);
  const display = resolveAmphoeFeeDisplay(d, 'PHUKET');
  assert(display.displayKind === 'checkout', `${d.id} should be checkout-backed`);
  assert(
    display.feeFrom === getZoneFee('PHUKET', d.checkoutZoneId!),
    `${d.id} fee matches Phuket zone`
  );
}
const phuketTownDisplay = resolveAmphoeFeeDisplay(
  PHUKET_AMPHOE_MAP_DISTRICTS.find((d) => d.id === 'phuket-town')!,
  'PHUKET'
);
const phuketAirportDisplay = resolveAmphoeFeeDisplay(
  PHUKET_AMPHOE_MAP_DISTRICTS.find((d) => d.id === 'mai-khao-airport-sakhu')!,
  'PHUKET'
);
assert(phuketTownDisplay.feeFrom === 250, 'Phuket Town feeFrom = 250');
assert(phuketAirportDisplay.feeFrom === 550, 'Mai Khao / Airport feeFrom = 550');

const phuketDrill = getAmphoeDrillItems('phuket', 'en');
assert(phuketDrill.length === 11, 'Phuket drill has 11 areas');
assert(
  phuketDrill.every((d) => d.subAreas.length === 0),
  'Phuket areas are first-class map districts, not nested rows'
);
const phuketCheckoutIds = getZonesForDestination('PHUKET')
  .map((z) => z.id)
  .sort();
const phuketMapZoneIds = PHUKET_AMPHOE_MAP_DISTRICTS.map((d) => d.checkoutZoneId!).sort();
assert(
  phuketCheckoutIds.join(',') === phuketMapZoneIds.join(','),
  'every Phuket checkout zone is a clickable map district'
);

assert(PRACHUAP_KHIRI_KHAN_AMPHOE_MAP_DISTRICTS.length === 6, 'Hua Hin map has 6 checkout areas');
const huaHinAmpCodes = new Set(PRACHUAP_KHIRI_KHAN_AMPHOE_MAP_DISTRICTS.map((d) => d.ampCode));
assert(huaHinAmpCodes.size === 6, 'each Hua Hin area has a unique amp_code');
for (const d of PRACHUAP_KHIRI_KHAN_AMPHOE_MAP_DISTRICTS) {
  assert(d.checkoutZoneId != null, `${d.id} needs checkoutZoneId`);
  const display = resolveAmphoeFeeDisplay(d, 'HUA_HIN');
  assert(display.displayKind === 'checkout', `${d.id} should be checkout-backed`);
  assert(
    display.feeFrom === getZoneFee('HUA_HIN', d.checkoutZoneId!),
    `${d.id} fee matches Hua Hin zone`
  );
}
const huaHinCenterDisplay = resolveAmphoeFeeDisplay(
  PRACHUAP_KHIRI_KHAN_AMPHOE_MAP_DISTRICTS.find((d) => d.id === 'hua-hin-center')!,
  'HUA_HIN'
);
const huaHinThapTaiDisplay = resolveAmphoeFeeDisplay(
  PRACHUAP_KHIRI_KHAN_AMPHOE_MAP_DISTRICTS.find((d) => d.id === 'thap-tai')!,
  'HUA_HIN'
);
assert(huaHinCenterDisplay.feeFrom === 250, 'Hua Hin Center feeFrom = 250');
assert(huaHinThapTaiDisplay.feeFrom === 350, 'Thap Tai feeFrom = 350');

const huaHinDrill = getAmphoeDrillItems('prachuap-khiri-khan', 'en');
assert(huaHinDrill.length === 6, 'Hua Hin drill has 6 areas');
assert(
  huaHinDrill.every((d) => d.subAreas.length === 0),
  'Hua Hin areas are first-class map districts, not nested rows'
);
const huaHinCheckoutIds = getZonesForDestination('HUA_HIN')
  .map((z) => z.id)
  .sort();
const huaHinMapZoneIds = PRACHUAP_KHIRI_KHAN_AMPHOE_MAP_DISTRICTS.map((d) => d.checkoutZoneId!).sort();
assert(
  huaHinCheckoutIds.join(',') === huaHinMapZoneIds.join(','),
  'every Hua Hin checkout zone is a clickable map district'
);

assert(KRABI_AMPHOE_MAP_DISTRICTS.length === 5, 'Krabi map has 5 checkout areas');
const krabiAmpCodes = new Set(KRABI_AMPHOE_MAP_DISTRICTS.map((d) => d.ampCode));
assert(krabiAmpCodes.size === 5, 'each Krabi area has a unique amp_code');
for (const d of KRABI_AMPHOE_MAP_DISTRICTS) {
  assert(d.checkoutZoneId != null, `${d.id} needs checkoutZoneId`);
  const display = resolveAmphoeFeeDisplay(d, 'KRABI');
  assert(display.displayKind === 'checkout', `${d.id} should be checkout-backed`);
  assert(
    display.feeFrom === getZoneFee('KRABI', d.checkoutZoneId!),
    `${d.id} fee matches Krabi zone`
  );
}
const aoNangDisplay = resolveAmphoeFeeDisplay(
  KRABI_AMPHOE_MAP_DISTRICTS.find((d) => d.id === 'ao-nang-center')!,
  'KRABI'
);
const tubkaekDisplay = resolveAmphoeFeeDisplay(
  KRABI_AMPHOE_MAP_DISTRICTS.find((d) => d.id === 'tubkaek')!,
  'KRABI'
);
assert(aoNangDisplay.feeFrom === 250, 'Ao Nang Center feeFrom = 250');
assert(tubkaekDisplay.feeFrom === 450, 'Tubkaek feeFrom = 450');

const krabiDrill = getAmphoeDrillItems('krabi', 'en');
assert(krabiDrill.length === 5, 'Krabi drill has 5 areas');
assert(
  krabiDrill.every((d) => d.subAreas.length === 0),
  'Krabi areas are first-class map districts, not nested rows'
);
const krabiCheckoutIds = getZonesForDestination('KRABI')
  .map((z) => z.id)
  .sort();
const krabiMapZoneIds = KRABI_AMPHOE_MAP_DISTRICTS.map((d) => d.checkoutZoneId!).sort();
assert(
  krabiCheckoutIds.join(',') === krabiMapZoneIds.join(','),
  'every Krabi checkout zone is a clickable map district'
);

assert(getZonesForDestination('SAMUI').length === 8, 'Samui has 8 checkout zones');
assert(getZoneFee('SAMUI', 'sui-chaweng') === 250, 'Samui Chaweng fee = 250');
assert(getZoneFee('SAMUI', 'sui-hua-thanon') === 350, 'Samui Hua Thanon fee = 350');

assert(SURAT_THANI_AMPHOE_MAP_DISTRICTS.length === 8, 'Samui map has 8 checkout areas');
const samuiAmpCodes = new Set(SURAT_THANI_AMPHOE_MAP_DISTRICTS.map((d) => d.ampCode));
assert(samuiAmpCodes.size === 8, 'each Samui area has a unique amp_code');
for (const d of SURAT_THANI_AMPHOE_MAP_DISTRICTS) {
  assert(d.checkoutZoneId != null, `${d.id} needs checkoutZoneId`);
  const display = resolveAmphoeFeeDisplay(d, 'SAMUI');
  assert(display.displayKind === 'checkout', `${d.id} should be checkout-backed`);
  assert(
    display.feeFrom === getZoneFee('SAMUI', d.checkoutZoneId!),
    `${d.id} fee matches Samui zone`
  );
}
const samuiChawengDisplay = resolveAmphoeFeeDisplay(
  SURAT_THANI_AMPHOE_MAP_DISTRICTS.find((d) => d.id === 'chaweng')!,
  'SAMUI'
);
const samuiHuaThanonDisplay = resolveAmphoeFeeDisplay(
  SURAT_THANI_AMPHOE_MAP_DISTRICTS.find((d) => d.id === 'hua-thanon')!,
  'SAMUI'
);
assert(samuiChawengDisplay.feeFrom === 250, 'Chaweng feeFrom = 250');
assert(samuiHuaThanonDisplay.feeFrom === 350, 'Hua Thanon feeFrom = 350');

const samuiDrill = getAmphoeDrillItems('surat-thani', 'en');
assert(samuiDrill.length === 8, 'Samui drill has 8 areas');
assert(
  samuiDrill.every((d) => d.subAreas.length === 0),
  'Samui areas are first-class map districts, not nested rows'
);
const samuiCheckoutIds = getZonesForDestination('SAMUI')
  .map((z) => z.id)
  .sort();
const samuiMapZoneIds = SURAT_THANI_AMPHOE_MAP_DISTRICTS.map((d) => d.checkoutZoneId!).sort();
assert(
  samuiCheckoutIds.join(',') === samuiMapZoneIds.join(','),
  'every Samui checkout zone is a clickable map district'
);

assert(BANGKOK_AMPHOE_MAP_DISTRICTS.length === 10, 'Bangkok map has 10 checkout areas');
const bangkokAmpCodes = new Set(BANGKOK_AMPHOE_MAP_DISTRICTS.map((d) => d.ampCode));
assert(bangkokAmpCodes.size === 10, 'each Bangkok area has a unique amp_code');
for (const d of BANGKOK_AMPHOE_MAP_DISTRICTS) {
  assert(d.checkoutZoneId != null, `${d.id} needs checkoutZoneId`);
  const display = resolveAmphoeFeeDisplay(d, 'BANGKOK');
  assert(display.displayKind === 'checkout', `${d.id} should be checkout-backed`);
  assert(
    display.feeFrom === getZoneFee('BANGKOK', d.checkoutZoneId!),
    `${d.id} fee matches Bangkok zone`
  );
}
const bangkokOldCityDisplay = resolveAmphoeFeeDisplay(
  BANGKOK_AMPHOE_MAP_DISTRICTS.find((d) => d.id === 'old-city')!,
  'BANGKOK'
);
const bangkokWestDisplay = resolveAmphoeFeeDisplay(
  BANGKOK_AMPHOE_MAP_DISTRICTS.find((d) => d.id === 'thonburi-west')!,
  'BANGKOK'
);
assert(bangkokOldCityDisplay.feeFrom === 250, 'Bangkok Old City feeFrom = 250');
assert(bangkokWestDisplay.feeFrom === 400, 'Thonburi west feeFrom = 400');

const bangkokDrill = getAmphoeDrillItems('bangkok', 'en');
assert(bangkokDrill.length === 10, 'Bangkok drill has 10 areas');
assert(
  bangkokDrill.every((d) => d.subAreas.length === 0),
  'Bangkok areas are first-class map districts, not nested rows'
);
const bangkokCheckoutIds = getZonesForDestination('BANGKOK')
  .map((z) => z.id)
  .sort();
const bangkokMapZoneIds = BANGKOK_AMPHOE_MAP_DISTRICTS.map((d) => d.checkoutZoneId!).sort();
assert(
  bangkokCheckoutIds.join(',') === bangkokMapZoneIds.join(','),
  'every Bangkok checkout zone is a clickable map district'
);

const ladder = getChiangMaiZoneFeeLadder();
const tiers = getDeliveryDistanceTiers();
const feeTiers = tiers.filter((t) => !t.driverConfirm);
assert(feeTiers.length === ladder.length, 'distance fee rows match zone ladder length');
for (let i = 0; i < ladder.length; i++) {
  assert(feeTiers[i].feeThb === ladder[i], `tier ${i} fee matches ladder`);
}
assert(tiers[tiers.length - 1].feeThb == null, 'last distance tier is driver-confirm');

console.log('✓ All delivery fee assertions passed');
process.exit(0);
