/**
 * Phuket map districts for the interactive coverage map.
 * Geometry lives in content/thailand-map/phuket-amphoes.topojson.
 *
 * Join key is properties.amp_code (OpenGIS tambon codes, dissolved to checkout zones):
 *   830101 Town (Talat Yai + Talat Nuea + Ratsada)
 *   830201 Kathu
 *   830106 Chalong
 *   830107 Rawai
 *   830108 Karon (includes Kata)
 *   830202 Patong
 *   830203 Kamala
 *   830303 Choeng Thale (Cherng Talay / Bang Tao / Laguna)
 *   830301 Thalang (Thep Krasattri + Si Sunthon)
 *   830304 Pa Khlok + Ko Kaeo (remote east)
 *   830305 Mai Khao + Sakhu
 *
 * OpenGIS has no Wichit tambon (830104). Island-wide listed checkout areas only.
 * Fee amounts are NOT stored here — derive via amphoeDisplayFees → zones.ts.
 */

import type { AmphoeFeeSource } from '@/lib/delivery/amphoeDisplayFees';

export type PhuketAmphoeMapId =
  | 'phuket-town'
  | 'kathu'
  | 'chalong'
  | 'rawai-nai-harn'
  | 'kata-karon'
  | 'patong'
  | 'kamala'
  | 'cherng-talay-bang-tao-laguna'
  | 'thalang-thep-krasattri'
  | 'pa-khlok-remote-east'
  | 'mai-khao-airport-sakhu';

export interface PhuketAmphoeMapDistrict extends AmphoeFeeSource {
  id: PhuketAmphoeMapId;
  /** Join key for TopoJSON properties.amp_code */
  ampCode: string;
  labelEn: string;
  labelTh: string;
  typicalAreasEn: string;
  typicalAreasTh: string;
}

export const PHUKET_AMPHOE_MAP_DISTRICTS: PhuketAmphoeMapDistrict[] = [
  {
    id: 'phuket-town',
    ampCode: '830101',
    labelEn: 'Phuket Town / Talad Yai / Talad Nuea',
    labelTh: 'เมืองภูเก็ต / ตลาดใหญ่ / ตลาดเหนือ',
    typicalAreasEn: 'Phuket Town, Talad Yai, Talad Nuea, Ratsada',
    typicalAreasTh: 'เมืองภูเก็ต ตลาดใหญ่ ตลาดเหนือ รัษฎา',
    checkoutZoneId: 'hkt-phuket-town',
  },
  {
    id: 'kathu',
    ampCode: '830201',
    labelEn: 'Kathu',
    labelTh: 'กะทู้',
    typicalAreasEn: 'Kathu',
    typicalAreasTh: 'กะทู้',
    checkoutZoneId: 'hkt-kathu',
  },
  {
    id: 'chalong',
    ampCode: '830106',
    labelEn: 'Chalong',
    labelTh: 'ฉลอง',
    typicalAreasEn: 'Chalong',
    typicalAreasTh: 'ฉลอง',
    checkoutZoneId: 'hkt-chalong',
  },
  {
    id: 'rawai-nai-harn',
    ampCode: '830107',
    labelEn: 'Rawai / Nai Harn',
    labelTh: 'ราไวย์ / ในหาน',
    typicalAreasEn: 'Rawai, Nai Harn',
    typicalAreasTh: 'ราไวย์ ในหาน',
    checkoutZoneId: 'hkt-rawai-nai-harn',
  },
  {
    id: 'kata-karon',
    ampCode: '830108',
    labelEn: 'Kata / Karon',
    labelTh: 'กะตะ / กะรน',
    typicalAreasEn: 'Kata, Karon',
    typicalAreasTh: 'กะตะ กะรน',
    checkoutZoneId: 'hkt-kata-karon',
  },
  {
    id: 'patong',
    ampCode: '830202',
    labelEn: 'Patong',
    labelTh: 'ป่าตอง',
    typicalAreasEn: 'Patong Beach',
    typicalAreasTh: 'หาดป่าตอง',
    checkoutZoneId: 'hkt-patong',
  },
  {
    id: 'kamala',
    ampCode: '830203',
    labelEn: 'Kamala',
    labelTh: 'กมลา',
    typicalAreasEn: 'Kamala Beach',
    typicalAreasTh: 'หาดกมลา',
    checkoutZoneId: 'hkt-kamala',
  },
  {
    id: 'cherng-talay-bang-tao-laguna',
    ampCode: '830303',
    labelEn: 'Cherng Talay / Bang Tao / Laguna',
    labelTh: 'เชิงทะเล / บางเทา / ลากูน่า',
    typicalAreasEn: 'Cherng Talay, Bang Tao, Laguna',
    typicalAreasTh: 'เชิงทะเล บางเทา ลากูน่า',
    checkoutZoneId: 'hkt-cherng-talay-bang-tao-laguna',
  },
  {
    id: 'thalang-thep-krasattri',
    ampCode: '830301',
    labelEn: 'Thalang / Thep Krasattri',
    labelTh: 'ถลาง / เทพกระษัตรี',
    typicalAreasEn: 'Thalang, Thep Krasattri, Si Sunthon',
    typicalAreasTh: 'ถลาง เทพกระษัตรี ศรีสุนทร',
    checkoutZoneId: 'hkt-thalang-thep-krasattri',
  },
  {
    id: 'pa-khlok-remote-east',
    ampCode: '830304',
    labelEn: 'Pa Khlok / remote east Phuket',
    labelTh: 'ป่าคลอก / ภูเก็ตตะวันออกห่างไกล',
    typicalAreasEn: 'Pa Khlok, Ko Kaeo',
    typicalAreasTh: 'ป่าคลอก เกาะแก้ว',
    checkoutZoneId: 'hkt-pa-khlok-remote-east',
  },
  {
    id: 'mai-khao-airport-sakhu',
    ampCode: '830305',
    labelEn: 'Mai Khao / Airport / Sakhu',
    labelTh: 'ไม้ขาว / สนามบิน / สะกู',
    typicalAreasEn: 'Mai Khao, Phuket Airport, Sakhu',
    typicalAreasTh: 'ไม้ขาว สนามบินภูเก็ต สะกู',
    checkoutZoneId: 'hkt-mai-khao-airport-sakhu',
  },
];

export function getPhuketAmphoeByAmpCode(
  ampCode: string
): PhuketAmphoeMapDistrict | undefined {
  return PHUKET_AMPHOE_MAP_DISTRICTS.find((d) => d.ampCode === ampCode);
}

export function getPhuketAmphoeById(id: string): PhuketAmphoeMapDistrict | undefined {
  return PHUKET_AMPHOE_MAP_DISTRICTS.find((d) => d.id === id);
}
