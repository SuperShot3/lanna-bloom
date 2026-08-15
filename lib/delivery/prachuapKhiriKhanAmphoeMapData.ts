/**
 * Hua Hin (Prachuap Khiri Khan) map districts for the interactive coverage map.
 * Geometry lives in content/thailand-map/prachuap-khiri-khan-amphoes.topojson.
 *
 * Join key is properties.amp_code:
 *   770703 Hin Lek Fai, 770705 Thap Tai (OpenGIS tambons)
 *   770791–770792 latitude slices of tambon Hua Hin (770701)
 *   770793–770794 latitude slices of tambon Nong Kae (770702)
 *
 * Other Prachuap Khiri Khan amphoes (Pran Buri, Sam Roi Yot, Mueang, etc.)
 * and inland Hua Hin tambons (Nong Phlap, Huai Sat Yai, Bueng Nakhon) are not mapped.
 * Fee amounts are NOT stored here — derive via amphoeDisplayFees → zones.ts.
 */

import type { AmphoeFeeSource } from '@/lib/delivery/amphoeDisplayFees';

export type PrachuapKhiriKhanAmphoeMapId =
  | 'hua-hin-center'
  | 'khao-takiab-nong-kae'
  | 'bo-fai-airport'
  | 'hua-don'
  | 'hin-lek-fai'
  | 'thap-tai';

export interface PrachuapKhiriKhanAmphoeMapDistrict extends AmphoeFeeSource {
  id: PrachuapKhiriKhanAmphoeMapId;
  /** Join key for TopoJSON properties.amp_code */
  ampCode: string;
  labelEn: string;
  labelTh: string;
  typicalAreasEn: string;
  typicalAreasTh: string;
}

export const PRACHUAP_KHIRI_KHAN_AMPHOE_MAP_DISTRICTS: PrachuapKhiriKhanAmphoeMapDistrict[] =
  [
    {
      id: 'hua-hin-center',
      ampCode: '770791',
      labelEn: 'Hua Hin Center',
      labelTh: 'หัวหินกลาง',
      typicalAreasEn: 'Hua Hin Beach, night market',
      typicalAreasTh: 'หาดหัวหิน ตลาดโต้รุ่ง',
      checkoutZoneId: 'hhi-center',
    },
    {
      id: 'khao-takiab-nong-kae',
      ampCode: '770793',
      labelEn: 'Khao Takiab / Nong Kae',
      labelTh: 'เขาตะเกียบ / หนองแก',
      typicalAreasEn: 'Khao Takiab, Nong Kae',
      typicalAreasTh: 'เขาตะเกียบ หนองแก',
      checkoutZoneId: 'hhi-khao-takiab-nong-kae',
    },
    {
      id: 'bo-fai-airport',
      ampCode: '770792',
      labelEn: 'Bo Fai / Hua Hin Airport area',
      labelTh: 'บ่อฝาย / พื้นที่สนามบินหัวหิน',
      typicalAreasEn: 'Bo Fai, Hua Hin Airport',
      typicalAreasTh: 'บ่อฝาย สนามบินหัวหิน',
      checkoutZoneId: 'hhi-bo-fai-airport',
    },
    {
      id: 'hua-don',
      ampCode: '770794',
      labelEn: 'Hua Don',
      labelTh: 'หัวดอน',
      typicalAreasEn: 'Hua Don Beach',
      typicalAreasTh: 'หาดหัวดอน',
      checkoutZoneId: 'hhi-hua-don',
    },
    {
      id: 'hin-lek-fai',
      ampCode: '770703',
      labelEn: 'Hin Lek Fai',
      labelTh: 'หินเหล็กไฟ',
      typicalAreasEn: 'Hin Lek Fai',
      typicalAreasTh: 'หินเหล็กไฟ',
      checkoutZoneId: 'hhi-hin-lek-fai',
    },
    {
      id: 'thap-tai',
      ampCode: '770705',
      labelEn: 'Thap Tai',
      labelTh: 'ทับใต้',
      typicalAreasEn: 'Thap Tai',
      typicalAreasTh: 'ทับใต้',
      checkoutZoneId: 'hhi-thap-tai',
    },
  ];

export function getPrachuapKhiriKhanAmphoeByAmpCode(
  ampCode: string
): PrachuapKhiriKhanAmphoeMapDistrict | undefined {
  return PRACHUAP_KHIRI_KHAN_AMPHOE_MAP_DISTRICTS.find((d) => d.ampCode === ampCode);
}

export function getPrachuapKhiriKhanAmphoeById(
  id: string
): PrachuapKhiriKhanAmphoeMapDistrict | undefined {
  return PRACHUAP_KHIRI_KHAN_AMPHOE_MAP_DISTRICTS.find((d) => d.id === id);
}
