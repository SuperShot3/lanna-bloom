/**
 * Simple assertions for delivery fee rules.
 * Run with: npx tsx lib/deliveryFees.test.ts (or add to test script).
 */

import { calcDeliveryFeeTHB, detectDistrictFromAddress, DISTRICTS } from './deliveryFees';

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(msg);
}

// Mueang Chiang Mai
assert(calcDeliveryFeeTHB({ district: 'MUEANG', isMueangCentral: true }) === 200, 'Mueang central = 200');
assert(calcDeliveryFeeTHB({ district: 'MUEANG', isMueangCentral: false }) === 300, 'Mueang non-central = 300');

// 300 THB districts
assert(calcDeliveryFeeTHB({ district: 'SARAPHI', isMueangCentral: false }) === 300, 'Saraphi = 300');
assert(calcDeliveryFeeTHB({ district: 'SAN_SAI', isMueangCentral: false }) === 300, 'San Sai = 300');

// 400 THB districts
assert(calcDeliveryFeeTHB({ district: 'HANG_DONG', isMueangCentral: false }) === 400, 'Hang Dong = 400');
assert(calcDeliveryFeeTHB({ district: 'SAN_KAMPHAENG', isMueangCentral: false }) === 400, 'San Kamphaeng = 400');
assert(calcDeliveryFeeTHB({ district: 'MAE_RIM', isMueangCentral: false }) === 400, 'Mae Rim = 400');

// 500 THB districts
assert(calcDeliveryFeeTHB({ district: 'DOI_SAKET', isMueangCentral: false }) === 500, 'Doi Saket = 500');
assert(calcDeliveryFeeTHB({ district: 'MAE_ON', isMueangCentral: false }) === 500, 'Mae On = 500');
assert(calcDeliveryFeeTHB({ district: 'SAMOENG', isMueangCentral: false }) === 500, 'Samoeng = 500');
assert(calcDeliveryFeeTHB({ district: 'MAE_TAENG', isMueangCentral: false }) === 500, 'Mae Taeng = 500');
assert(calcDeliveryFeeTHB({ district: 'UNKNOWN', isMueangCentral: false }) === 500, 'Unknown = 500');

// Auto-detect
assert(detectDistrictFromAddress('123 Nimman Road') === 'MUEANG', 'Nimman -> Mueang');
assert(detectDistrictFromAddress('หางดง') === 'HANG_DONG', 'Thai Hang Dong');
assert(detectDistrictFromAddress('อ.สันกำแพง') === 'SAN_KAMPHAENG', 'Thai San Kamphaeng');
assert(detectDistrictFromAddress('random address') === null, 'No match -> null');

// Districts array
assert(DISTRICTS.length >= 10, 'DISTRICTS has options');

console.log('✓ All delivery fee assertions passed');
process.exit(0);
