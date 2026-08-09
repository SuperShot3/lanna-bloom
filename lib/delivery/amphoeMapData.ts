/**
 * Chiang Mai amphoe metadata for the interactive delivery district map.
 * Geometry lives in content/thailand-map/chiang-mai-amphoes.topojson (OpenGIS amp_code).
 *
 * Fee amounts are NOT stored here — derive via amphoeDisplayFees → zones.ts.
 */

export type AmphoeMapId =
  | 'mueang-chiang-mai'
  | 'mae-rim'
  | 'san-sai'
  | 'doi-saket'
  | 'san-kamphaeng'
  | 'mae-on'
  | 'hang-dong'
  | 'saraphi'
  | 'san-pa-tong'
  | 'mae-wang'
  | 'samoeng'
  | 'mae-taeng'
  | 'chiang-dao'
  | 'fang'
  | 'mae-ai'
  | 'chom-thong'
  | 'mae-chaem'
  | 'hot'
  | 'doi-tao'
  | 'omkoi'
  | 'phrao'
  | 'wiang-haeng'
  | 'chai-prakan'
  | 'doi-lo'
  | 'galyani-vadhana'
  | 'other';

export interface AmphoeMapDistrict {
  id: AmphoeMapId;
  /** OpenGIS districts.geojson amp_code (join key for TopoJSON) */
  ampCode: string;
  labelEn: string;
  labelTh: string;
  typicalAreasEn: string;
  typicalAreasTh: string;
  /** Primary checkout zone id when selectable at checkout */
  checkoutZoneId?: string;
  /** When one amphoe spans several checkout zones (e.g. Mueang) */
  relatedCheckoutZoneIds?: string[];
  /** Requires manual quote — not in checkout dropdown */
  manualQuote?: boolean;
}

/** Mueang amphoe covers several fine-grained checkout zones. */
const MUEANG_CHECKOUT_ZONE_IDS = [
  'cm-mueang-central',
  'cm-chang-phueak',
  'cm-suthep',
  'cm-nong-pa-khrang',
  'cm-mueang-non-central',
] as const;

const REMOTE_CONFIRM_EN =
  'Remote Chiang Mai district — confirm availability and fee with the driver before ordering';
const REMOTE_CONFIRM_TH =
  'อำเภอห่างไกลในเชียงใหม่ — ยืนยันความพร้อมและค่าจัดส่งกับพนักงานขับรถก่อนสั่งซื้อ';

export const AMPHOE_MAP_DISTRICTS: AmphoeMapDistrict[] = [
  {
    id: 'mueang-chiang-mai',
    ampCode: '5001',
    labelEn: 'Mueang Chiang Mai',
    labelTh: 'เมืองเชียงใหม่',
    typicalAreasEn:
      'Old City, Nimman, Chang Phueak, Suthep, Night Bazaar — fee depends on the exact checkout zone within Mueang',
    typicalAreasTh:
      'เมืองเก่า นิมมาน ช้างเผือก สุเทพ ไนท์บาซาร์ — ค่าจัดส่งขึ้นกับโซนเช็กเอาต์ภายในเมือง',
    checkoutZoneId: 'cm-mueang-central',
    relatedCheckoutZoneIds: [...MUEANG_CHECKOUT_ZONE_IDS],
  },
  {
    id: 'chom-thong',
    ampCode: '5002',
    labelEn: 'Chom Thong',
    labelTh: 'จอมทอง',
    typicalAreasEn: REMOTE_CONFIRM_EN,
    typicalAreasTh: REMOTE_CONFIRM_TH,
    checkoutZoneId: 'cm-unknown',
    manualQuote: true,
  },
  {
    id: 'mae-chaem',
    ampCode: '5003',
    labelEn: 'Mae Chaem',
    labelTh: 'แม่แจ่ม',
    typicalAreasEn: REMOTE_CONFIRM_EN,
    typicalAreasTh: REMOTE_CONFIRM_TH,
    checkoutZoneId: 'cm-unknown',
    manualQuote: true,
  },
  {
    id: 'chiang-dao',
    ampCode: '5004',
    labelEn: 'Chiang Dao',
    labelTh: 'เชียงดาว',
    typicalAreasEn: 'Chiang Dao town and nearby — typically 40–45 km from central Chiang Mai',
    typicalAreasTh: 'ตัวเมืองเชียงดาวและใกล้เคียง — โดยทั่วไป 40–45 กม. จากใจกลางเชียงใหม่',
    checkoutZoneId: 'cm-chiang-dao',
  },
  {
    id: 'doi-saket',
    ampCode: '5005',
    labelEn: 'Doi Saket',
    labelTh: 'ดอยสะเก็ด',
    typicalAreasEn: 'Doi Saket town and nearby areas in the Doi Saket checkout zone',
    typicalAreasTh: 'ตัวเมืองดอยสะเก็ดและพื้นที่ใกล้เคียงในโซนเช็กเอาต์ดอยสะเก็ด',
    checkoutZoneId: 'cm-doi-saket',
  },
  {
    id: 'mae-taeng',
    ampCode: '5006',
    labelEn: 'Mae Taeng',
    labelTh: 'แม่แตง',
    typicalAreasEn: 'Mae Taeng town and Mon Cham vicinity',
    typicalAreasTh: 'ตัวเมืองแม่แตงและบริเวณม่อนแจ่ม',
    checkoutZoneId: 'cm-mae-taeng',
  },
  {
    id: 'mae-rim',
    ampCode: '5007',
    labelEn: 'Mae Rim',
    labelTh: 'แม่ริม',
    typicalAreasEn: 'Mae Rim town and nearby destinations in the Mae Rim checkout zone',
    typicalAreasTh: 'ตัวเมืองแม่ริมและปลายทางในโซนเช็กเอาต์แม่ริม',
    checkoutZoneId: 'cm-mae-rim',
  },
  {
    id: 'samoeng',
    ampCode: '5008',
    labelEn: 'Samoeng',
    labelTh: 'สะเมิง',
    typicalAreasEn: 'Samoeng town and remote western areas — typically 40+ km',
    typicalAreasTh: 'ตัวเมืองสะเมิงและพื้นที่ตะวันตกห่างไกล — โดยทั่วไปมากกว่า 40 กม.',
    checkoutZoneId: 'cm-samoeng',
  },
  {
    id: 'fang',
    ampCode: '5009',
    labelEn: 'Fang',
    labelTh: 'ฝาง',
    typicalAreasEn: 'Fang district — confirm availability and fee with the driver before ordering',
    typicalAreasTh: 'อำเภอฝาง — ยืนยันความพร้อมและค่าจัดส่งกับพนักงานขับรถก่อนสั่งซื้อ',
    checkoutZoneId: 'cm-fang',
    manualQuote: true,
  },
  {
    id: 'mae-ai',
    ampCode: '5010',
    labelEn: 'Mae Ai',
    labelTh: 'แม่อาย',
    typicalAreasEn:
      'Northern Chiang Mai — far from Warorot; confirm route and fee with the driver before ordering',
    typicalAreasTh:
      'เชียงใหม่เหนือ — ห่างจากวโรรส ยืนยันเส้นทางและค่าจัดส่งกับพนักงานขับรถก่อนสั่งซื้อ',
    checkoutZoneId: 'cm-mae-ai',
    manualQuote: true,
  },
  {
    id: 'phrao',
    ampCode: '5011',
    labelEn: 'Phrao',
    labelTh: 'พร้าว',
    typicalAreasEn: REMOTE_CONFIRM_EN,
    typicalAreasTh: REMOTE_CONFIRM_TH,
    checkoutZoneId: 'cm-unknown',
    manualQuote: true,
  },
  {
    id: 'san-pa-tong',
    ampCode: '5012',
    labelEn: 'San Pa Tong',
    labelTh: 'สันป่าตอง',
    typicalAreasEn: 'San Pa Tong town and nearby — typically 20–25 km from central Chiang Mai',
    typicalAreasTh: 'ตัวเมืองสันป่าตองและใกล้เคียง — โดยทั่วไป 20–25 กม. จากใจกลางเชียงใหม่',
    checkoutZoneId: 'cm-san-pa-tong',
  },
  {
    id: 'san-kamphaeng',
    ampCode: '5013',
    labelEn: 'San Kamphaeng',
    labelTh: 'สันกำแพง',
    typicalAreasEn: 'San Kamphaeng town and areas in the San Kamphaeng checkout zone',
    typicalAreasTh: 'ตัวเมืองสันกำแพงและพื้นที่ในโซนเช็กเอาต์สันกำแพง',
    checkoutZoneId: 'cm-san-kamphaeng',
  },
  {
    id: 'san-sai',
    ampCode: '5014',
    labelEn: 'San Sai',
    labelTh: 'สันทราย',
    typicalAreasEn: 'San Sai town and areas in the San Sai checkout zone',
    typicalAreasTh: 'ตัวเมืองสันทรายและพื้นที่ในโซนเช็กเอาต์สันทราย',
    checkoutZoneId: 'cm-san-sai',
  },
  {
    id: 'hang-dong',
    ampCode: '5015',
    labelEn: 'Hang Dong',
    labelTh: 'หางดง',
    typicalAreasEn: 'Hang Dong town and areas in the Hang Dong checkout zone',
    typicalAreasTh: 'ตัวเมืองหางดงและพื้นที่ในโซนเช็กเอาต์หางดง',
    checkoutZoneId: 'cm-hang-dong',
  },
  {
    id: 'hot',
    ampCode: '5016',
    labelEn: 'Hot',
    labelTh: 'ฮอด',
    typicalAreasEn: REMOTE_CONFIRM_EN,
    typicalAreasTh: REMOTE_CONFIRM_TH,
    checkoutZoneId: 'cm-unknown',
    manualQuote: true,
  },
  {
    id: 'doi-tao',
    ampCode: '5017',
    labelEn: 'Doi Tao',
    labelTh: 'ดอยเต่า',
    typicalAreasEn: REMOTE_CONFIRM_EN,
    typicalAreasTh: REMOTE_CONFIRM_TH,
    checkoutZoneId: 'cm-unknown',
    manualQuote: true,
  },
  {
    id: 'omkoi',
    ampCode: '5018',
    labelEn: 'Omkoi',
    labelTh: 'อมก๋อย',
    typicalAreasEn: REMOTE_CONFIRM_EN,
    typicalAreasTh: REMOTE_CONFIRM_TH,
    checkoutZoneId: 'cm-unknown',
    manualQuote: true,
  },
  {
    id: 'saraphi',
    ampCode: '5019',
    labelEn: 'Saraphi',
    labelTh: 'สารภี',
    typicalAreasEn: 'Saraphi town and areas in the Saraphi checkout zone',
    typicalAreasTh: 'ตัวเมืองสารภีและพื้นที่ในโซนเช็กเอาต์สารภี',
    checkoutZoneId: 'cm-saraphi',
  },
  {
    id: 'wiang-haeng',
    ampCode: '5020',
    labelEn: 'Wiang Haeng',
    labelTh: 'เวียงแหง',
    typicalAreasEn: REMOTE_CONFIRM_EN,
    typicalAreasTh: REMOTE_CONFIRM_TH,
    checkoutZoneId: 'cm-unknown',
    manualQuote: true,
  },
  {
    id: 'chai-prakan',
    ampCode: '5021',
    labelEn: 'Chai Prakan',
    labelTh: 'ไชยปราการ',
    typicalAreasEn: REMOTE_CONFIRM_EN,
    typicalAreasTh: REMOTE_CONFIRM_TH,
    checkoutZoneId: 'cm-unknown',
    manualQuote: true,
  },
  {
    id: 'mae-wang',
    ampCode: '5022',
    labelEn: 'Mae Wang',
    labelTh: 'แม่วาง',
    typicalAreasEn: 'Mae Wang and western valleys',
    typicalAreasTh: 'แม่วางและหุบเขาตะวันตก',
    checkoutZoneId: 'cm-mae-wang',
  },
  {
    id: 'mae-on',
    ampCode: '5023',
    labelEn: 'Mae On',
    labelTh: 'แม่ออน',
    typicalAreasEn: 'Mae On and nearby destinations in the Mae On checkout zone',
    typicalAreasTh: 'แม่ออนและปลายทางใกล้เคียงในโซนเช็กเอาต์แม่ออน',
    checkoutZoneId: 'cm-mae-on',
  },
  {
    id: 'doi-lo',
    ampCode: '5024',
    labelEn: 'Doi Lo',
    labelTh: 'ดอยหล่อ',
    typicalAreasEn: REMOTE_CONFIRM_EN,
    typicalAreasTh: REMOTE_CONFIRM_TH,
    checkoutZoneId: 'cm-unknown',
    manualQuote: true,
  },
  {
    id: 'galyani-vadhana',
    ampCode: '5025',
    labelEn: 'Galyani Vadhana',
    labelTh: 'กัลยาณิวัฒนา',
    typicalAreasEn: REMOTE_CONFIRM_EN,
    typicalAreasTh: REMOTE_CONFIRM_TH,
    checkoutZoneId: 'cm-unknown',
    manualQuote: true,
  },
];

export const AMPHOE_MAP_OTHER: Omit<AmphoeMapDistrict, 'ampCode'> = {
  id: 'other',
  labelEn: 'My location is not listed',
  labelTh: 'พื้นที่ของฉันไม่อยู่ในรายการ',
  typicalAreasEn:
    'Paste your Google Maps pin at checkout or message us — we confirm the zone and fee with the driver before delivery.',
  typicalAreasTh:
    'วางหมุด Google Maps ตอนเช็กเอาต์หรือทักเรา — เรายืนยันโซนและค่าจัดส่งกับพนักงานขับรถก่อนส่ง',
};

export function getAmphoeById(id: AmphoeMapId): AmphoeMapDistrict | undefined {
  return AMPHOE_MAP_DISTRICTS.find((d) => d.id === id);
}

export function getAmphoeByAmpCode(ampCode: string): AmphoeMapDistrict | undefined {
  return AMPHOE_MAP_DISTRICTS.find((d) => d.ampCode === ampCode);
}
