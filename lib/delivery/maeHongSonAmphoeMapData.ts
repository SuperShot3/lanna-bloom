/**
 * Pai (Mae Hong Son) map districts for the interactive coverage map.
 * Geometry lives in content/thailand-map/mae-hong-son-amphoes.topojson.
 *
 * Join key is properties.amp_code (OpenGIS tambon tam_code):
 *   580301 Wiang Tai, 580302 Wiang Nuea, 580303 Mae Na Toeng, 580304 Mae Hi,
 *   580305 Thung Yao, 580306 Mueang Paeng, 580307 Pong Sa
 *
 * Other Mae Hong Son amphoes (Mueang Mae Hong Son, Khun Yuam, Mae Sariang,
 * Mae La Noi, Sop Moei, Pang Mapha) are not mapped.
 * Fee amounts are NOT stored here — derive via amphoeDisplayFees → zones.ts.
 */

import type { AmphoeFeeSource } from '@/lib/delivery/amphoeDisplayFees';

export type MaeHongSonAmphoeMapId =
  | 'wiang-tai'
  | 'wiang-nuea'
  | 'mae-hi'
  | 'mae-na-toeng'
  | 'thung-yao'
  | 'mueang-paeng'
  | 'pong-sa';

export interface MaeHongSonAmphoeMapDistrict extends AmphoeFeeSource {
  id: MaeHongSonAmphoeMapId;
  /** Join key for TopoJSON properties.amp_code */
  ampCode: string;
  labelEn: string;
  labelTh: string;
  typicalAreasEn: string;
  typicalAreasTh: string;
}

export const MAE_HONG_SON_AMPHOE_MAP_DISTRICTS: MaeHongSonAmphoeMapDistrict[] = [
  {
    id: 'wiang-tai',
    ampCode: '580301',
    labelEn: 'Wiang Tai / Pai town',
    labelTh: 'เวียงใต้ / ตัวเมืองปาย',
    typicalAreasEn: 'Pai Walking Street, Pai Hospital',
    typicalAreasTh: 'ถนนคนเดินปาย โรงพยาบาลปาย',
    checkoutZoneId: 'pai-wiang-tai',
  },
  {
    id: 'wiang-nuea',
    ampCode: '580302',
    labelEn: 'Wiang Nuea',
    labelTh: 'เวียงเหนือ',
    typicalAreasEn: 'North of Pai town',
    typicalAreasTh: 'เหนือตัวเมืองปาย',
    checkoutZoneId: 'pai-wiang-nuea',
  },
  {
    id: 'mae-hi',
    ampCode: '580304',
    labelEn: 'Mae Hi',
    labelTh: 'แม่ฮี้',
    typicalAreasEn: 'Pai Canyon area',
    typicalAreasTh: 'แถบแปะแคนยอน',
    checkoutZoneId: 'pai-mae-hi',
  },
  {
    id: 'mae-na-toeng',
    ampCode: '580303',
    labelEn: 'Mae Na Toeng',
    labelTh: 'แม่นาเติง',
    typicalAreasEn: 'Yun Lai, mountain resorts',
    typicalAreasTh: 'ยูนลาย รีสอร์ตบนเขา',
    checkoutZoneId: 'pai-mae-na-toeng',
  },
  {
    id: 'thung-yao',
    ampCode: '580305',
    labelEn: 'Thung Yao',
    labelTh: 'ทุ่งยาว',
    typicalAreasEn: 'Thung Yao countryside',
    typicalAreasTh: 'ชนบททุ่งยาว',
    checkoutZoneId: 'pai-thung-yao',
  },
  {
    id: 'mueang-paeng',
    ampCode: '580306',
    labelEn: 'Mueang Paeng',
    labelTh: 'เมืองแปง',
    typicalAreasEn: 'Mueang Paeng mountain villages',
    typicalAreasTh: 'หมู่บ้านบนเขาเมืองแปง',
    checkoutZoneId: 'pai-mueang-paeng',
  },
  {
    id: 'pong-sa',
    ampCode: '580307',
    labelEn: 'Pong Sa',
    labelTh: 'โป่งสา',
    typicalAreasEn: 'Pong Sa remote mountain',
    typicalAreasTh: 'โป่งสา พื้นที่บนเขาห่างไกล',
    checkoutZoneId: 'pai-pong-sa',
  },
];

export function getMaeHongSonAmphoeByAmpCode(
  ampCode: string
): MaeHongSonAmphoeMapDistrict | undefined {
  return MAE_HONG_SON_AMPHOE_MAP_DISTRICTS.find((d) => d.ampCode === ampCode);
}

export function getMaeHongSonAmphoeById(id: string): MaeHongSonAmphoeMapDistrict | undefined {
  return MAE_HONG_SON_AMPHOE_MAP_DISTRICTS.find((d) => d.id === id);
}
