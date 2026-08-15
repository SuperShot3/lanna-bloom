/**
 * Koh Samui (Surat Thani) map districts for the interactive coverage map.
 * Geometry lives in content/thailand-map/surat-thani-amphoes.topojson.
 *
 * Join key is properties.amp_code:
 *   840401 Na Thon / Ang Thong (mainland OpenGIS tambon; marine-park islands dropped)
 *   840407 Mae Nam (OpenGIS tambon)
 *   840491 dissolved Lipa Noi 840402 + mainland Taling Ngam 840403
 *   840492–840493 latitude slices of tambon Maret (840405)
 *   840494–840496 longitude/latitude slices of tambon Bo Phut (840406)
 *
 * Other Surat Thani amphoes (Ko Pha-ngan, Don Sak, Mueang, etc.), tambon Na Mueang,
 * Ang Thong National Park islands, and Koh Tan are not mapped.
 * Fee amounts are NOT stored here — derive via amphoeDisplayFees → zones.ts.
 */

import type { AmphoeFeeSource } from '@/lib/delivery/amphoeDisplayFees';

export type SuratThaniAmphoeMapId =
  | 'chaweng'
  | 'bophut-fisherman'
  | 'lamai'
  | 'maenam'
  | 'bangrak-choengmon'
  | 'lipa-noi-taling-ngam'
  | 'na-thon-ang-thong'
  | 'hua-thanon';

export interface SuratThaniAmphoeMapDistrict extends AmphoeFeeSource {
  id: SuratThaniAmphoeMapId;
  /** Join key for TopoJSON properties.amp_code */
  ampCode: string;
  labelEn: string;
  labelTh: string;
  typicalAreasEn: string;
  typicalAreasTh: string;
}

export const SURAT_THANI_AMPHOE_MAP_DISTRICTS: SuratThaniAmphoeMapDistrict[] = [
  {
    id: 'chaweng',
    ampCode: '840496',
    labelEn: 'Chaweng',
    labelTh: 'เฉวง',
    typicalAreasEn: 'Chaweng Beach, Central Festival',
    typicalAreasTh: 'หาดเฉวง เซ็นทรัลเฟสติวัล',
    checkoutZoneId: 'sui-chaweng',
  },
  {
    id: 'bophut-fisherman',
    ampCode: '840494',
    labelEn: 'Bo Phut / Fisherman\'s Village',
    labelTh: 'บ่อผุด / ฟิชเชอร์แมนวิลเลจ',
    typicalAreasEn: 'Fisherman\'s Village, Bo Phut Beach',
    typicalAreasTh: 'ฟิชเชอร์แมนวิลเลจ หาดบ่อผุด',
    checkoutZoneId: 'sui-bophut-fisherman',
  },
  {
    id: 'lamai',
    ampCode: '840492',
    labelEn: 'Lamai',
    labelTh: 'ละไม',
    typicalAreasEn: 'Lamai Beach',
    typicalAreasTh: 'หาดละไม',
    checkoutZoneId: 'sui-lamai',
  },
  {
    id: 'maenam',
    ampCode: '840407',
    labelEn: 'Mae Nam',
    labelTh: 'แม่น้ำ',
    typicalAreasEn: 'Mae Nam Beach',
    typicalAreasTh: 'หาดแม่น้ำ',
    checkoutZoneId: 'sui-maenam',
  },
  {
    id: 'bangrak-choengmon',
    ampCode: '840495',
    labelEn: 'Bangrak / Choeng Mon',
    labelTh: 'บางรัก / เชิงมน',
    typicalAreasEn: 'Bangrak Beach, Choeng Mon, Samui Airport',
    typicalAreasTh: 'หาดบางรัก เชิงมน สนามบินสมุย',
    checkoutZoneId: 'sui-bangrak-choengmon',
  },
  {
    id: 'lipa-noi-taling-ngam',
    ampCode: '840491',
    labelEn: 'Lipa Noi / Taling Ngam',
    labelTh: 'ลิปะน้อย / ตลิ่งงาม',
    typicalAreasEn: 'Lipa Noi, Taling Ngam Beach',
    typicalAreasTh: 'ลิปะน้อย หาดตลิ่งงาม',
    checkoutZoneId: 'sui-lipa-noi-taling-ngam',
  },
  {
    id: 'na-thon-ang-thong',
    ampCode: '840401',
    labelEn: 'Na Thon / Ang Thong',
    labelTh: 'หน้าทอน / อ่างทอง',
    typicalAreasEn: 'Na Thon pier, Ang Thong',
    typicalAreasTh: 'ท่าเรือหน้าทอน อ่างทอง',
    checkoutZoneId: 'sui-na-thon-ang-thong',
  },
  {
    id: 'hua-thanon',
    ampCode: '840493',
    labelEn: 'Hua Thanon',
    labelTh: 'หัวถนน',
    typicalAreasEn: 'Hua Thanon',
    typicalAreasTh: 'หัวถนน',
    checkoutZoneId: 'sui-hua-thanon',
  },
];

export function getSuratThaniAmphoeByAmpCode(
  ampCode: string
): SuratThaniAmphoeMapDistrict | undefined {
  return SURAT_THANI_AMPHOE_MAP_DISTRICTS.find((d) => d.ampCode === ampCode);
}

export function getSuratThaniAmphoeById(id: string): SuratThaniAmphoeMapDistrict | undefined {
  return SURAT_THANI_AMPHOE_MAP_DISTRICTS.find((d) => d.id === id);
}
