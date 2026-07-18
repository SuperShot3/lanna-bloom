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
import { getDeliveryDistanceTiers } from './delivery/distanceTiers';
import {
  detectChiangMaiZoneFromAddress,
  getCheckoutZonesForDestination,
  getChiangMaiZoneFeeLadder,
  getZoneFee,
  getZonesForDestination,
} from './delivery/zones';

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

// 650+ THB districts
assert(calcDeliveryFeeTHB({ district: 'LAMPHUN', isMueangCentral: false }) === 650, 'Lamphun = 650');
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
assert(detectDistrictFromAddress('Mueang Lamphun') === 'LAMPHUN', 'Lamphun before generic mueang');
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
assert(getZoneFee('CHIANG_MAI', 'cm-lamphun') === 650, 'Lamphun fee = 650');
assert(getZonesForDestination('CHIANG_MAI').length === 24, 'Chiang Mai has 24 zones');
assert(getCheckoutZonesForDestination('CHIANG_MAI').length === 22, 'Checkout excludes manual-quote zones');

// Districts array
assert(DISTRICTS.length >= 10, 'DISTRICTS has options');

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
