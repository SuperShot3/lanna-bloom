/**
 * Simple assertions for delivery fee rules.
 * Run with: npx tsx lib/deliveryFees.test.ts (or add to test script).
 */

import { calcDeliveryFeeTHB, detectDistrictFromAddress, DISTRICTS } from './deliveryFees';

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(msg);
}

// Mueang Chiang Mai
assert(calcDeliveryFeeTHB({ district: 'MUEANG', isMueangCentral: true }) === 250, 'Mueang central = 250');
assert(calcDeliveryFeeTHB({ district: 'MUEANG', isMueangCentral: false }) === 350, 'Mueang non-central = 350');

// 350 THB districts
assert(calcDeliveryFeeTHB({ district: 'SARAPHI', isMueangCentral: false }) === 350, 'Saraphi = 350');
assert(calcDeliveryFeeTHB({ district: 'SAN_SAI', isMueangCentral: false }) === 350, 'San Sai = 350');
assert(calcDeliveryFeeTHB({ district: 'LAMPHUN', isMueangCentral: false }) === 350, 'Lamphun = 350');

// 450 THB districts
assert(calcDeliveryFeeTHB({ district: 'HANG_DONG', isMueangCentral: false }) === 450, 'Hang Dong = 450');
assert(calcDeliveryFeeTHB({ district: 'SAN_KAMPHAENG', isMueangCentral: false }) === 450, 'San Kamphaeng = 450');
assert(calcDeliveryFeeTHB({ district: 'MAE_RIM', isMueangCentral: false }) === 450, 'Mae Rim = 450');

// 550 THB districts
assert(calcDeliveryFeeTHB({ district: 'DOI_SAKET', isMueangCentral: false }) === 550, 'Doi Saket = 550');
assert(calcDeliveryFeeTHB({ district: 'MAE_ON', isMueangCentral: false }) === 550, 'Mae On = 550');
assert(calcDeliveryFeeTHB({ district: 'SAMOENG', isMueangCentral: false }) === 550, 'Samoeng = 550');
assert(calcDeliveryFeeTHB({ district: 'MAE_TAENG', isMueangCentral: false }) === 550, 'Mae Taeng = 550');
assert(calcDeliveryFeeTHB({ district: 'UNKNOWN', isMueangCentral: false }) === 550, 'Unknown = 550');

// Auto-detect
assert(detectDistrictFromAddress('123 Nimman Road') === 'MUEANG', 'Nimman -> Mueang');
assert(detectDistrictFromAddress('หางดง') === 'HANG_DONG', 'Thai Hang Dong');
assert(detectDistrictFromAddress('อ.สันกำแพง') === 'SAN_KAMPHAENG', 'Thai San Kamphaeng');
assert(detectDistrictFromAddress('Mueang Lamphun') === 'LAMPHUN', 'Lamphun before generic mueang');
assert(detectDistrictFromAddress('random address') === null, 'No match -> null');

// Districts array
assert(DISTRICTS.length >= 10, 'DISTRICTS has options');

console.log('✓ All delivery fee assertions passed');
process.exit(0);
