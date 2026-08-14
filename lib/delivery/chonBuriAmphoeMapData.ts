/**
 * Pattaya (Chon Buri) map districts for the interactive coverage map.
 * Geometry lives in content/thailand-map/chon-buri-amphoes.topojson.
 *
 * Join key is properties.amp_code:
 *   200408 Na Kluea, 200402 Nong Prue, 200902 Na Chom Thian (OpenGIS tambons)
 *   200491–200494 latitude slices of the Pattaya special-admin tambon (200409)
 *
 * Other Chon Buri amphoes (Si Racha, Mueang Chon Buri, rest of Sattahip) are not mapped.
 * Fee amounts are NOT stored here — derive via amphoeDisplayFees → zones.ts.
 */

import type { AmphoeFeeSource } from '@/lib/delivery/amphoeDisplayFees';

export type ChonBuriAmphoeMapId =
  | 'central-pattaya'
  | 'north-naklua-wongamat'
  | 'south-walking-street'
  | 'pratumnak'
  | 'jomtien'
  | 'na-jomtien'
  | 'east-nong-prue';

export interface ChonBuriAmphoeMapDistrict extends AmphoeFeeSource {
  id: ChonBuriAmphoeMapId;
  /** Join key for TopoJSON properties.amp_code */
  ampCode: string;
  labelEn: string;
  labelTh: string;
  typicalAreasEn: string;
  typicalAreasTh: string;
}

export const CHON_BURI_AMPHOE_MAP_DISTRICTS: ChonBuriAmphoeMapDistrict[] = [
  {
    id: 'central-pattaya',
    ampCode: '200491',
    labelEn: 'Central Pattaya',
    labelTh: 'พัทยากลาง',
    typicalAreasEn: 'Beach Road, Central Pattaya',
    typicalAreasTh: 'ถนนพัทยาสายกลาง พัทยากลาง',
    checkoutZoneId: 'pat-central-pattaya',
  },
  {
    id: 'north-naklua-wongamat',
    ampCode: '200408',
    labelEn: 'North Pattaya / Naklua / Wongamat',
    labelTh: 'พัทยาเหนือ / นาเกลือ / วงศ์อมาตย์',
    typicalAreasEn: 'Naklua, Wongamat, North Pattaya',
    typicalAreasTh: 'นาเกลือ วงศ์อมาตย์ พัทยาเหนือ',
    checkoutZoneId: 'pat-north-naklua-wongamat',
  },
  {
    id: 'south-walking-street',
    ampCode: '200492',
    labelEn: 'South Pattaya / Walking Street area',
    labelTh: 'พัทยาใต้ / วอล์คกิ้งสตรีท',
    typicalAreasEn: 'Walking Street, South Pattaya',
    typicalAreasTh: 'วอล์คกิ้งสตรีท พัทยาใต้',
    checkoutZoneId: 'pat-south-walking-street',
  },
  {
    id: 'pratumnak',
    ampCode: '200493',
    labelEn: 'Pratumnak',
    labelTh: 'พระตำหนัก',
    typicalAreasEn: 'Pratumnak Hill',
    typicalAreasTh: 'เขาพระตำหนัก',
    checkoutZoneId: 'pat-pratumnak',
  },
  {
    id: 'jomtien',
    ampCode: '200494',
    labelEn: 'Jomtien',
    labelTh: 'จอมเทียน',
    typicalAreasEn: 'Jomtien Beach',
    typicalAreasTh: 'หาดจอมเทียน',
    checkoutZoneId: 'pat-jomtien',
  },
  {
    id: 'na-jomtien',
    ampCode: '200902',
    labelEn: 'Na Jomtien',
    labelTh: 'นาจอมเทียน',
    typicalAreasEn: 'Na Jomtien (listed Pattaya area)',
    typicalAreasTh: 'นาจอมเทียน (ย่านพัทยาในรายการ)',
    checkoutZoneId: 'pat-na-jomtien',
  },
  {
    id: 'east-nong-prue',
    ampCode: '200402',
    labelEn: 'East Pattaya / Nong Prue',
    labelTh: 'พัทยาตะวันออก / หนองปรือ',
    typicalAreasEn: 'Nong Prue, East Pattaya',
    typicalAreasTh: 'หนองปรือ พัทยาตะวันออก',
    checkoutZoneId: 'pat-east-nong-prue',
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
