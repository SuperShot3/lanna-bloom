/**
 * Seed roster for all Thai provinces (76 + Bangkok).
 * topojson_property_value must match NAME_1 in content/thailand-map/thailand-provinces.topojson.
 * Lake geometries in that file are not provinces and are excluded here.
 */

import type { ProvinceStatus } from './types';

export type ProvinceSeedRow = {
  province_code: string;
  province_name_en: string;
  province_name_th: string;
  topojson_property_value: string;
  destination_id: string | null;
  status: ProvinceStatus;
  catalog_enabled: boolean;
  customer_message_en?: string | null;
  customer_message_th?: string | null;
};

function comingSoon(
  nameEn: string,
  nameTh: string,
  topoName: string = nameEn
): ProvinceSeedRow {
  const province_code = slugifyProvinceName(topoName);
  return {
    province_code,
    province_name_en: nameEn,
    province_name_th: nameTh,
    topojson_property_value: topoName,
    destination_id: null,
    status: 'coming_soon',
    catalog_enabled: false,
  };
}

/** Slugify TopoJSON NAME_1 (or display EN) into our stable province_code. */
export function slugifyProvinceName(name: string): string {
  const special: Record<string, string> = {
    'Bangkok Metropolis': 'bangkok',
  };
  if (special[name]) return special[name];
  return name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * TopoJSON water geometries that should inherit parent province styling on the map.
 * Not seeded as province rows.
 */
export const TOPOJSON_LAKE_ALIASES: Record<string, string> = {
  'Phatthalung (Songkhla Lake)': 'Phatthalung',
  'Songkhla (Songkhla Lake)': 'Songkhla',
};

const WIRED: ProvinceSeedRow[] = [
  {
    province_code: 'chiang-mai',
    province_name_en: 'Chiang Mai',
    province_name_th: 'เชียงใหม่',
    topojson_property_value: 'Chiang Mai',
    destination_id: 'CHIANG_MAI',
    status: 'same_day',
    catalog_enabled: true,
    customer_message_en:
      'Same-day and next-day flower delivery across Chiang Mai (subject to cutoff and zone fees).',
    customer_message_th:
      'จัดส่งดอกไม้วันเดียวกันและวันถัดไปทั่วเชียงใหม่ (ขึ้นกับเวลาตัดออเดอร์และค่าโซน)',
  },
  {
    province_code: 'chon-buri',
    province_name_en: 'Chon Buri',
    province_name_th: 'ชลบุรี',
    topojson_property_value: 'Chon Buri',
    destination_id: 'PATTAYA',
    status: 'same_day',
    catalog_enabled: true,
    customer_message_en:
      'Flower delivery for Pattaya and surrounding Chon Buri areas (subject to cutoff and coverage).',
    customer_message_th:
      'จัดส่งดอกไม้พัทยาและพื้นที่ใกล้เคียงในชลบุรี (ขึ้นกับเวลาตัดออเดอร์และความครอบคลุม)',
  },
  {
    province_code: 'phuket',
    province_name_en: 'Phuket',
    province_name_th: 'ภูเก็ต',
    topojson_property_value: 'Phuket',
    destination_id: 'PHUKET',
    status: 'same_day',
    catalog_enabled: true,
    customer_message_en: 'Flower delivery across Phuket (subject to cutoff and coverage).',
    customer_message_th: 'จัดส่งดอกไม้ทั่วภูเก็ต (ขึ้นกับเวลาตัดออเดอร์และความครอบคลุม)',
  },
  {
    province_code: 'krabi',
    province_name_en: 'Krabi',
    province_name_th: 'กระบี่',
    topojson_property_value: 'Krabi',
    destination_id: 'KRABI',
    status: 'same_day',
    catalog_enabled: true,
    customer_message_en: 'Flower delivery for Krabi / Ao Nang (subject to cutoff and coverage).',
    customer_message_th: 'จัดส่งดอกไม้กระบี่ / อ่าวนาง (ขึ้นกับเวลาตัดออเดอร์และความครอบคลุม)',
  },
  {
    province_code: 'surat-thani',
    province_name_en: 'Surat Thani',
    province_name_th: 'สุราษฎร์ธานี',
    topojson_property_value: 'Surat Thani',
    destination_id: 'SAMUI',
    status: 'same_day',
    catalog_enabled: true,
    customer_message_en:
      'Flower delivery for Koh Samui (Surat Thani). Mainland coverage may be limited.',
    customer_message_th:
      'จัดส่งดอกไม้เกาะสมุย (สุราษฎร์ธานี) พื้นที่ฝั่งแผ่นดินอาจจำกัด',
  },
  {
    province_code: 'prachuap-khiri-khan',
    province_name_en: 'Prachuap Khiri Khan',
    province_name_th: 'ประจวบคีรีขันธ์',
    topojson_property_value: 'Prachuap Khiri Khan',
    destination_id: 'HUA_HIN',
    status: 'same_day',
    catalog_enabled: true,
    customer_message_en: 'Flower delivery for Hua Hin (subject to cutoff and coverage).',
    customer_message_th: 'จัดส่งดอกไม้หัวหิน (ขึ้นกับเวลาตัดออเดอร์และความครอบคลุม)',
  },
];

const COMING_SOON: ProvinceSeedRow[] = [
  comingSoon('Amnat Charoen', 'อำนาจเจริญ'),
  comingSoon('Ang Thong', 'อ่างทอง'),
  comingSoon('Bangkok', 'กรุงเทพมหานคร', 'Bangkok Metropolis'),
  comingSoon('Buri Ram', 'บุรีรัมย์'),
  comingSoon('Chachoengsao', 'ฉะเชิงเทรา'),
  comingSoon('Chai Nat', 'ชัยนาท'),
  comingSoon('Chaiyaphum', 'ชัยภูมิ'),
  comingSoon('Chanthaburi', 'จันทบุรี'),
  comingSoon('Chiang Rai', 'เชียงราย'),
  comingSoon('Chumphon', 'ชุมพร'),
  comingSoon('Kalasin', 'กาฬสินธุ์'),
  comingSoon('Kamphaeng Phet', 'กำแพงเพชร'),
  comingSoon('Kanchanaburi', 'กาญจนบุรี'),
  comingSoon('Khon Kaen', 'ขอนแก่น'),
  comingSoon('Lampang', 'ลำปาง'),
  comingSoon('Lamphun', 'ลำพูน'),
  comingSoon('Loei', 'เลย'),
  comingSoon('Lop Buri', 'ลพบุรี'),
  comingSoon('Mae Hong Son', 'แม่ฮ่องสอน'),
  comingSoon('Maha Sarakham', 'มหาสารคาม'),
  comingSoon('Mukdahan', 'มุกดาหาร'),
  comingSoon('Nakhon Nayok', 'นครนายก'),
  comingSoon('Nakhon Pathom', 'นครปฐม'),
  comingSoon('Nakhon Phanom', 'นครพนม'),
  comingSoon('Nakhon Ratchasima', 'นครราชสีมา'),
  comingSoon('Nakhon Sawan', 'นครสวรรค์'),
  comingSoon('Nakhon Si Thammarat', 'นครศรีธรรมราช'),
  comingSoon('Nan', 'น่าน'),
  comingSoon('Narathiwat', 'นราธิวาส'),
  comingSoon('Nong Bua Lam Phu', 'หนองบัวลำภู'),
  comingSoon('Nong Khai', 'หนองคาย'),
  comingSoon('Nonthaburi', 'นนทบุรี'),
  comingSoon('Pathum Thani', 'ปทุมธานี'),
  comingSoon('Pattani', 'ปัตตานี'),
  comingSoon('Phangnga', 'พังงา'),
  comingSoon('Phatthalung', 'พัทลุง'),
  comingSoon('Phayao', 'พะเยา'),
  comingSoon('Phetchabun', 'เพชรบูรณ์'),
  comingSoon('Phetchaburi', 'เพชรบุรี'),
  comingSoon('Phichit', 'พิจิตร'),
  comingSoon('Phitsanulok', 'พิษณุโลก'),
  comingSoon('Phra Nakhon Si Ayutthaya', 'พระนครศรีอยุธยา'),
  comingSoon('Phrae', 'แพร่'),
  comingSoon('Prachin Buri', 'ปราจีนบุรี'),
  comingSoon('Ranong', 'ระนอง'),
  comingSoon('Ratchaburi', 'ราชบุรี'),
  comingSoon('Rayong', 'ระยอง'),
  comingSoon('Roi Et', 'ร้อยเอ็ด'),
  comingSoon('Sa Kaeo', 'สระแก้ว'),
  comingSoon('Sakon Nakhon', 'สกลนคร'),
  comingSoon('Samut Prakan', 'สมุทรปราการ'),
  comingSoon('Samut Sakhon', 'สมุทรสาคร'),
  comingSoon('Samut Songkhram', 'สมุทรสงคราม'),
  comingSoon('Saraburi', 'สระบุรี'),
  comingSoon('Satun', 'สตูล'),
  comingSoon('Si Sa Ket', 'ศรีสะเกษ'),
  comingSoon('Sing Buri', 'สิงห์บุรี'),
  comingSoon('Songkhla', 'สงขลา'),
  comingSoon('Sukhothai', 'สุโขทัย'),
  comingSoon('Suphan Buri', 'สุพรรณบุรี'),
  comingSoon('Surin', 'สุรินทร์'),
  comingSoon('Tak', 'ตาก'),
  comingSoon('Trang', 'ตรัง'),
  comingSoon('Trat', 'ตราด'),
  comingSoon('Ubon Ratchathani', 'อุบลราชธานี'),
  comingSoon('Udon Thani', 'อุดรธานี'),
  comingSoon('Uthai Thani', 'อุทัยธานี'),
  comingSoon('Uttaradit', 'อุตรดิตถ์'),
  comingSoon('Yala', 'ยะลา'),
  comingSoon('Yasothon', 'ยโสธร'),
];

export const PROVINCE_SEED_ROSTER: ProvinceSeedRow[] = [...WIRED, ...COMING_SOON].sort((a, b) =>
  a.province_name_en.localeCompare(b.province_name_en)
);
