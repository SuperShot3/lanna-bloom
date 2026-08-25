/**
 * Bangkok map districts for the interactive coverage map.
 * Geometry lives in content/thailand-map/bangkok-amphoes.topojson.
 *
 * Join key is properties.amp_code (OpenGIS khet codes, dissolved to checkout zones):
 *   1001 Old City / Rattanakosin (Phra Nakhon + Pom Prap + Samphanthawong)
 *   1007 Siam / Silom / Sathon (Pathum Wan + Bang Rak + Sathon + Bang Kho Laem + Yan Nawa)
 *   1033 Sukhumvit (Khlong Toei + Watthana + Phra Khanong + Bang Na)
 *   1002 Dusit / Victory Monument (Dusit + Phaya Thai + Ratchathewi + Din Daeng)
 *   1030 Chatuchak / inner north (Chatuchak + Bang Sue + Lat Phrao + Huai Khwang)
 *   1006 East inner (Bang Kapi + Wang Thonglang + Bueng Kum + Khan Na Yao + Saphan Sung + Suan Luang)
 *   1015 Thonburi inner (Thon Buri + Bangkok Yai + Bangkok Noi + Khlong San + Chom Thong + Thung Khru + Rat Burana)
 *   1036 North / Don Mueang (Bang Khen + Lak Si + Don Mueang + Sai Mai)
 *   1010 East outer (Min Buri + Nong Chok + Lat Krabang + Khlong Sam Wa + Prawet)
 *   1019 Thonburi west (Taling Chan + Bang Phlat + Bang Khae + Phasi Charoen + Nong Khaem + Thawi Watthana + Bang Bon + Bang Khun Thian)
 *
 * Whole-province listed checkout areas only (50 khet, no Nonthaburi / Samut Prakan).
 * Fee amounts are NOT stored here — derive via amphoeDisplayFees → zones.ts.
 */

import type { AmphoeFeeSource } from '@/lib/delivery/amphoeDisplayFees';

export type BangkokAmphoeMapId =
  | 'old-city'
  | 'siam-silom-sathon'
  | 'sukhumvit'
  | 'dusit-victory'
  | 'chatuchak-inner-north'
  | 'east-inner'
  | 'thonburi-inner'
  | 'north-don-mueang'
  | 'east-outer'
  | 'thonburi-west';

export interface BangkokAmphoeMapDistrict extends AmphoeFeeSource {
  id: BangkokAmphoeMapId;
  /** Join key for TopoJSON properties.amp_code */
  ampCode: string;
  labelEn: string;
  labelTh: string;
  typicalAreasEn: string;
  typicalAreasTh: string;
}

export const BANGKOK_AMPHOE_MAP_DISTRICTS: BangkokAmphoeMapDistrict[] = [
  {
    id: 'old-city',
    ampCode: '1001',
    labelEn: 'Old City / Rattanakosin',
    labelTh: 'เมืองเก่า / รัตนโกสินทร์',
    typicalAreasEn: 'Phra Nakhon, Pom Prap Sattru Phai, Samphanthawong',
    typicalAreasTh: 'พระนคร ป้อมปราบศัตรูพ่าย สัมพันธวงศ์',
    checkoutZoneId: 'bkk-old-city',
  },
  {
    id: 'siam-silom-sathon',
    ampCode: '1007',
    labelEn: 'Siam / Silom / Sathon',
    labelTh: 'สยาม / สีลม / สาทร',
    typicalAreasEn: 'Pathum Wan, Bang Rak, Sathon, Bang Kho Laem, Yan Nawa',
    typicalAreasTh: 'ปทุมวัน บางรัก สาทร บางคอแหลม ยานนาวา',
    checkoutZoneId: 'bkk-siam-silom-sathon',
  },
  {
    id: 'sukhumvit',
    ampCode: '1033',
    labelEn: 'Sukhumvit',
    labelTh: 'สุขุมวิท',
    typicalAreasEn: 'Khlong Toei, Watthana, Phra Khanong, Bang Na',
    typicalAreasTh: 'คลองเตย วัฒนา พระโขนง บางนา',
    checkoutZoneId: 'bkk-sukhumvit',
  },
  {
    id: 'dusit-victory',
    ampCode: '1002',
    labelEn: 'Dusit / Victory Monument',
    labelTh: 'ดุสิต / อนุสาวรีย์ชัยสมรภูมิ',
    typicalAreasEn: 'Dusit, Phaya Thai, Ratchathewi, Din Daeng',
    typicalAreasTh: 'ดุสิต พญาไท ราชเทวี ดินแดง',
    checkoutZoneId: 'bkk-dusit-victory',
  },
  {
    id: 'chatuchak-inner-north',
    ampCode: '1030',
    labelEn: 'Chatuchak / inner north',
    labelTh: 'จตุจักร / กรุงเทพฯเหนือชั้นใน',
    typicalAreasEn: 'Chatuchak, Bang Sue, Lat Phrao, Huai Khwang',
    typicalAreasTh: 'จตุจักร บางซื่อ ลาดพร้าว ห้วยขวาง',
    checkoutZoneId: 'bkk-chatuchak-inner-north',
  },
  {
    id: 'east-inner',
    ampCode: '1006',
    labelEn: 'East inner Bangkok',
    labelTh: 'กรุงเทพฯตะวันออกชั้นใน',
    typicalAreasEn: 'Bang Kapi, Wang Thonglang, Bueng Kum, Khan Na Yao, Saphan Sung, Suan Luang',
    typicalAreasTh: 'บางกะปิ วังทองหลาง บึงกุ่ม คันนายาว สะพานสูง สวนหลวง',
    checkoutZoneId: 'bkk-east-inner',
  },
  {
    id: 'thonburi-inner',
    ampCode: '1015',
    labelEn: 'Thonburi inner',
    labelTh: 'ธนบุรีชั้นใน',
    typicalAreasEn:
      'Thon Buri, Bangkok Yai, Bangkok Noi, Khlong San, Chom Thong, Thung Khru, Rat Burana',
    typicalAreasTh: 'ธนบุรี บางกอกใหญ่ บางกอกน้อย คลองสาน จอมทอง ทุ่งครุ ราษฎร์บูรณะ',
    checkoutZoneId: 'bkk-thonburi-inner',
  },
  {
    id: 'north-don-mueang',
    ampCode: '1036',
    labelEn: 'North / Don Mueang',
    labelTh: 'กรุงเทพฯเหนือ / ดอนเมือง',
    typicalAreasEn: 'Bang Khen, Lak Si, Don Mueang, Sai Mai',
    typicalAreasTh: 'บางเขน หลักสี่ ดอนเมือง สายไหม',
    checkoutZoneId: 'bkk-north-don-mueang',
  },
  {
    id: 'east-outer',
    ampCode: '1010',
    labelEn: 'East outer Bangkok',
    labelTh: 'กรุงเทพฯตะวันออกชั้นนอก',
    typicalAreasEn: 'Min Buri, Nong Chok, Lat Krabang, Khlong Sam Wa, Prawet',
    typicalAreasTh: 'มีนบุรี หนองจอก ลาดกระบัง คลองสามวา ประเวศ',
    checkoutZoneId: 'bkk-east-outer',
  },
  {
    id: 'thonburi-west',
    ampCode: '1019',
    labelEn: 'Thonburi west',
    labelTh: 'ธนบุรีตะวันตก',
    typicalAreasEn:
      'Taling Chan, Bang Phlat, Bang Khae, Phasi Charoen, Nong Khaem, Thawi Watthana, Bang Bon, Bang Khun Thian',
    typicalAreasTh:
      'ตลิ่งชัน บางพลัด บางแค ภาษีเจริญ หนองแขม ทวีวัฒนา บางบอน บางขุนเทียน',
    checkoutZoneId: 'bkk-thonburi-west',
  },
];

export function getBangkokAmphoeByAmpCode(
  ampCode: string
): BangkokAmphoeMapDistrict | undefined {
  return BANGKOK_AMPHOE_MAP_DISTRICTS.find((d) => d.ampCode === ampCode);
}

export function getBangkokAmphoeById(id: string): BangkokAmphoeMapDistrict | undefined {
  return BANGKOK_AMPHOE_MAP_DISTRICTS.find((d) => d.id === id);
}
