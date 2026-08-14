/**
 * Chon Buri amphoe metadata for the interactive delivery district map.
 * Geometry lives in content/thailand-map/chon-buri-amphoes.topojson (OpenGIS amp_code).
 *
 * Pattaya-only: Bang Lamung polygon + nested Pattaya checkout zones.
 * Other Chon Buri amphoes (Si Racha, Mueang Chon Buri, Sattahip, …) are not mapped.
 *
 * Fee amounts are NOT stored here — derive via amphoeDisplayFees → zones.ts.
 */

import type { AmphoeFeeSource } from '@/lib/delivery/amphoeDisplayFees';

export type ChonBuriAmphoeMapId = 'bang-lamung';

export interface ChonBuriAmphoeMapDistrict extends AmphoeFeeSource {
  id: ChonBuriAmphoeMapId;
  /** OpenGIS districts.geojson amp_code (join key for TopoJSON) */
  ampCode: string;
  labelEn: string;
  labelTh: string;
  typicalAreasEn: string;
  typicalAreasTh: string;
}

/** All current PATTAYA checkout zones nested under Bang Lamung. */
export const PATTAYA_CHECKOUT_ZONE_IDS = [
  'pat-central-pattaya',
  'pat-north-naklua-wongamat',
  'pat-south-walking-street',
  'pat-pratumnak',
  'pat-jomtien',
  'pat-na-jomtien',
  'pat-east-nong-prue',
] as const;

export const CHON_BURI_AMPHOE_MAP_DISTRICTS: ChonBuriAmphoeMapDistrict[] = [
  {
    id: 'bang-lamung',
    ampCode: '2004',
    labelEn: 'Bang Lamung',
    labelTh: 'บางละมุง',
    typicalAreasEn: 'Pattaya City, Jomtien, Naklua, Nong Prue',
    typicalAreasTh: 'ตัวเมืองพัทยา จอมเทียน นาเกลือ หนองปรือ',
    checkoutZoneId: 'pat-central-pattaya',
    relatedCheckoutZoneIds: [...PATTAYA_CHECKOUT_ZONE_IDS],
  },
];

export function getChonBuriAmphoeByAmpCode(
  ampCode: string
): ChonBuriAmphoeMapDistrict | undefined {
  return CHON_BURI_AMPHOE_MAP_DISTRICTS.find((d) => d.ampCode === ampCode);
}

export function getChonBuriAmphoeById(
  id: string
): ChonBuriAmphoeMapDistrict | undefined {
  return CHON_BURI_AMPHOE_MAP_DISTRICTS.find((d) => d.id === id);
}
