/**
 * Lamphun amphoe metadata for the interactive delivery district map.
 * Geometry lives in content/thailand-map/lamphun-amphoes.topojson (OpenGIS amp_code).
 *
 * Fee amounts are NOT stored here — derive via amphoeDisplayFees → zones.ts.
 */

import type { AmphoeFeeSource } from '@/lib/delivery/amphoeDisplayFees';

export type LamphunAmphoeMapId =
  | 'mueang-lamphun'
  | 'mae-tha'
  | 'ban-hong'
  | 'li'
  | 'thung-hua-chang'
  | 'pa-sang'
  | 'ban-thi'
  | 'wiang-nong-long';

export interface LamphunAmphoeMapDistrict extends AmphoeFeeSource {
  id: LamphunAmphoeMapId;
  /** OpenGIS districts.geojson amp_code (join key for TopoJSON) */
  ampCode: string;
  labelEn: string;
  labelTh: string;
  typicalAreasEn: string;
  typicalAreasTh: string;
}

export const LAMPHUN_AMPHOE_MAP_DISTRICTS: LamphunAmphoeMapDistrict[] = [
  {
    id: 'mueang-lamphun',
    ampCode: '5101',
    labelEn: 'Mueang Lamphun',
    labelTh: 'เมืองลำพูน',
    typicalAreasEn: 'Lamphun city, Hariphunchai area',
    typicalAreasTh: 'ตัวเมืองลำพูน พื้นที่หริภุญชัย',
    checkoutZoneId: 'lp-mueang-lamphun',
  },
  {
    id: 'mae-tha',
    ampCode: '5102',
    labelEn: 'Mae Tha',
    labelTh: 'แม่ทา',
    typicalAreasEn: 'Mae Tha district',
    typicalAreasTh: 'อำเภอแม่ทา',
    checkoutZoneId: 'lp-mae-tha',
  },
  {
    id: 'ban-hong',
    ampCode: '5103',
    labelEn: 'Ban Hong',
    labelTh: 'บ้านโฮ่ง',
    typicalAreasEn: 'Ban Hong district',
    typicalAreasTh: 'อำเภอบ้านโฮ่ง',
    checkoutZoneId: 'lp-ban-hong',
  },
  {
    id: 'li',
    ampCode: '5104',
    labelEn: 'Li',
    labelTh: 'ลี้',
    typicalAreasEn: 'Li district',
    typicalAreasTh: 'อำเภอลี้',
    checkoutZoneId: 'lp-li',
  },
  {
    id: 'thung-hua-chang',
    ampCode: '5105',
    labelEn: 'Thung Hua Chang',
    labelTh: 'ทุ่งหัวช้าง',
    typicalAreasEn: 'Thung Hua Chang district',
    typicalAreasTh: 'อำเภอทุ่งหัวช้าง',
    checkoutZoneId: 'lp-thung-hua-chang',
  },
  {
    id: 'pa-sang',
    ampCode: '5106',
    labelEn: 'Pa Sang',
    labelTh: 'ป่าซาง',
    typicalAreasEn: 'Pa Sang district',
    typicalAreasTh: 'อำเภอป่าซาง',
    checkoutZoneId: 'lp-pa-sang',
  },
  {
    id: 'ban-thi',
    ampCode: '5107',
    labelEn: 'Ban Thi',
    labelTh: 'บ้านธิ',
    typicalAreasEn: 'Ban Thi district',
    typicalAreasTh: 'อำเภอบ้านธิ',
    checkoutZoneId: 'lp-ban-thi',
  },
  {
    id: 'wiang-nong-long',
    ampCode: '5108',
    labelEn: 'Wiang Nong Long',
    labelTh: 'เวียงหนองล่อง',
    typicalAreasEn: 'Wiang Nong Long district',
    typicalAreasTh: 'อำเภอเวียงหนองล่อง',
    checkoutZoneId: 'lp-wiang-nong-long',
  },
];

export function getLamphunAmphoeByAmpCode(
  ampCode: string
): LamphunAmphoeMapDistrict | undefined {
  return LAMPHUN_AMPHOE_MAP_DISTRICTS.find((d) => d.ampCode === ampCode);
}

export function getLamphunAmphoeById(
  id: string
): LamphunAmphoeMapDistrict | undefined {
  return LAMPHUN_AMPHOE_MAP_DISTRICTS.find((d) => d.id === id);
}
