/**
 * Krabi / Ao Nang map districts for the interactive coverage map.
 * Geometry lives in content/thailand-map/krabi-amphoes.topojson.
 *
 * Join key is properties.amp_code:
 *   810101 Krabi Town (OpenGIS tambon Pak Nam; Krabi Yai 810102 is missing)
 *   810106 Khao Thong (OpenGIS tambon)
 *   810191–810192 latitude slices of mainland tambon Ao Nang (810116)
 *   810193–810194 latitude slices of tambon Nong Thale (810117)
 *
 * Island fragments of tambon Ao Nang and the rest of Krabi (Koh Lanta, Ao Luek,
 * Khao Phanom, Nuea Khlong, etc.) are not mapped.
 * Fee amounts are NOT stored here — derive via amphoeDisplayFees → zones.ts.
 */

import type { AmphoeFeeSource } from '@/lib/delivery/amphoeDisplayFees';

export type KrabiAmphoeMapId =
  | 'ao-nang-center'
  | 'noppharat-thara'
  | 'krabi-town'
  | 'klong-muang'
  | 'tubkaek'
  | 'khao-thong';

export interface KrabiAmphoeMapDistrict extends AmphoeFeeSource {
  id: KrabiAmphoeMapId;
  /** Join key for TopoJSON properties.amp_code */
  ampCode: string;
  labelEn: string;
  labelTh: string;
  typicalAreasEn: string;
  typicalAreasTh: string;
}

export const KRABI_AMPHOE_MAP_DISTRICTS: KrabiAmphoeMapDistrict[] = [
  {
    id: 'ao-nang-center',
    ampCode: '810191',
    labelEn: 'Ao Nang Center',
    labelTh: 'อ่าวนางกลาง',
    typicalAreasEn: 'Ao Nang Beach, Railay',
    typicalAreasTh: 'หาดอ่าวนาง ไร่เลย์',
    checkoutZoneId: 'kbn-ao-nang-center',
  },
  {
    id: 'noppharat-thara',
    ampCode: '810192',
    labelEn: 'Noppharat Thara',
    labelTh: 'นพรัตน์ธารา',
    typicalAreasEn: 'Noppharat Thara Beach',
    typicalAreasTh: 'หาดนพรัตน์ธารา',
    checkoutZoneId: 'kbn-noppharat-thara',
  },
  {
    id: 'krabi-town',
    ampCode: '810101',
    labelEn: 'Krabi Town',
    labelTh: 'เมืองกระบี่',
    typicalAreasEn: 'Krabi Town, Pak Nam',
    typicalAreasTh: 'เมืองกระบี่ ปากน้ำ',
    checkoutZoneId: 'kbn-krabi-town',
  },
  {
    id: 'klong-muang',
    ampCode: '810193',
    labelEn: 'Klong Muang',
    labelTh: 'คลองม่วง',
    typicalAreasEn: 'Klong Muang Beach',
    typicalAreasTh: 'หาดคลองม่วง',
    checkoutZoneId: 'kbn-klong-muang',
  },
  {
    id: 'tubkaek',
    ampCode: '810194',
    labelEn: 'Tubkaek',
    labelTh: 'ถ้ำแขก',
    typicalAreasEn: 'Tubkaek Beach',
    typicalAreasTh: 'หาดถ้ำแขก',
    checkoutZoneId: 'kbn-tubkaek',
  },
  {
    id: 'khao-thong',
    ampCode: '810106',
    labelEn: 'Khao Thong',
    labelTh: 'เขาทอง',
    typicalAreasEn: 'Khao Thong',
    typicalAreasTh: 'เขาทอง',
    checkoutZoneId: 'kbn-khao-thong',
  },
];

export function getKrabiAmphoeByAmpCode(ampCode: string): KrabiAmphoeMapDistrict | undefined {
  return KRABI_AMPHOE_MAP_DISTRICTS.find((d) => d.ampCode === ampCode);
}

export function getKrabiAmphoeById(id: string): KrabiAmphoeMapDistrict | undefined {
  return KRABI_AMPHOE_MAP_DISTRICTS.find((d) => d.id === id);
}
