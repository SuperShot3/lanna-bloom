/**
 * Simplified Chiang Mai amphoe map data for the interactive delivery district map.
 * SVG paths are schematic (not official boundaries).
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
  | 'other';

export interface AmphoeMapDistrict {
  id: AmphoeMapId;
  labelEn: string;
  labelTh: string;
  /** SVG path d attribute */
  pathD: string;
  /** Label position */
  labelX: number;
  labelY: number;
  /** Multi-line label (optional second line y offset) */
  labelLine2Dy?: number;
  /** Explicit label lines when auto-split is insufficient */
  labelLinesEn?: string[];
  labelLinesTh?: string[];
  typicalAreasEn: string;
  typicalAreasTh: string;
  /** Primary checkout zone id when selectable at checkout */
  checkoutZoneId?: string;
  /** When one amphoe spans several checkout zones (e.g. Mueang) */
  relatedCheckoutZoneIds?: string[];
  /** Requires manual quote — not in checkout dropdown */
  manualQuote?: boolean;
}

export const PROVINCE_OUTLINE_D =
  'M390 30 L500 25 L550 75 L520 145 L460 165 L420 230 L440 330 L420 455 L465 450 L520 500 L500 590 L560 575 L580 650 L540 705 L500 720 L430 740 L355 770 L300 795 L255 840 L175 820 L140 760 L75 725 L55 630 L95 540 L120 470 L190 420 L235 300 L260 220 L300 145 L330 55 Z';

/** Mueang amphoe covers several fine-grained checkout zones. */
const MUEANG_CHECKOUT_ZONE_IDS = [
  'cm-mueang-central',
  'cm-chang-phueak',
  'cm-suthep',
  'cm-nong-pa-khrang',
  'cm-mueang-non-central',
] as const;

export const AMPHOE_MAP_DISTRICTS: AmphoeMapDistrict[] = [
  {
    id: 'mae-ai',
    labelEn: 'Mae Ai',
    labelTh: 'แม่เอ๋ย',
    pathD: 'M390 30 L500 25 L550 75 L520 145 L460 165 L405 130 Z',
    labelX: 470,
    labelY: 95,
    typicalAreasEn: 'Northern Chiang Mai — far from Warorot; confirm route and fee with the driver before ordering',
    typicalAreasTh: 'เชียงใหม่เหนือ — ห่างจากวโรรส ยืนยันเส้นทางและค่าจัดส่งกับพนักงานขับรถก่อนสั่งซื้อ',
    checkoutZoneId: 'cm-mae-ai',
    manualQuote: true,
  },
  {
    id: 'fang',
    labelEn: 'Fang',
    labelTh: 'ฝาง',
    pathD: 'M330 55 L390 30 L405 130 L460 165 L420 230 L335 210 L300 145 Z',
    labelX: 370,
    labelY: 145,
    typicalAreasEn: 'Fang district — confirm availability and fee with the driver before ordering',
    typicalAreasTh: 'อำเภอฝาง — ยืนยันความพร้อมและค่าจัดส่งกับพนักงานขับรถก่อนสั่งซื้อ',
    checkoutZoneId: 'cm-fang',
    manualQuote: true,
  },
  {
    id: 'chiang-dao',
    labelEn: 'Chiang Dao',
    labelTh: 'เชียงดาว',
    pathD: 'M260 220 L335 210 L420 230 L440 330 L390 395 L280 370 L235 300 Z',
    labelX: 350,
    labelY: 305,
    typicalAreasEn: 'Chiang Dao town and nearby — typically 40–45 km from central Chiang Mai',
    typicalAreasTh: 'ตัวเมืองเชียงดาวและใกล้เคียง — โดยทั่วไป 40–45 กม. จากใจกลางเชียงใหม่',
    checkoutZoneId: 'cm-chiang-dao',
  },
  {
    id: 'mae-taeng',
    labelEn: 'Mae Taeng',
    labelTh: 'แม่แตง',
    pathD: 'M235 300 L280 370 L390 395 L420 455 L360 520 L245 500 L190 420 Z',
    labelX: 305,
    labelY: 430,
    typicalAreasEn: 'Mae Taeng town and Mon Cham vicinity',
    typicalAreasTh: 'ตัวเมืองแม่แตงและบริเวณม่อนแจ่ม',
    checkoutZoneId: 'cm-mae-taeng',
  },
  {
    id: 'samoeng',
    labelEn: 'Samoeng',
    labelTh: 'สะเมิง',
    pathD: 'M120 470 L190 420 L245 500 L230 590 L145 610 L95 540 Z',
    labelX: 165,
    labelY: 535,
    typicalAreasEn: 'Samoeng town and remote western areas — typically 40+ km',
    typicalAreasTh: 'ตัวเมืองสะเมิงและพื้นที่ตะวันตกห่างไกล — โดยทั่วไปมากกว่า 40 กม.',
    checkoutZoneId: 'cm-samoeng',
  },
  {
    id: 'mae-rim',
    labelEn: 'Mae Rim',
    labelTh: 'แม่ริม',
    pathD: 'M245 500 L320 505 L345 575 L300 635 L230 590 Z',
    labelX: 285,
    labelY: 555,
    typicalAreasEn: 'Mae Rim town and nearby destinations in the Mae Rim checkout zone',
    typicalAreasTh: 'ตัวเมืองแม่ริมและปลายทางในโซนเช็กเอาต์แม่ริม',
    checkoutZoneId: 'cm-mae-rim',
  },
  {
    id: 'san-sai',
    labelEn: 'San Sai',
    labelTh: 'สันทราย',
    pathD: 'M320 505 L390 480 L450 535 L420 615 L345 575 Z',
    labelX: 390,
    labelY: 550,
    typicalAreasEn: 'San Sai town and areas in the San Sai checkout zone',
    typicalAreasTh: 'ตัวเมืองสันทรายและพื้นที่ในโซนเช็กเอาต์สันทราย',
    checkoutZoneId: 'cm-san-sai',
  },
  {
    id: 'doi-saket',
    labelEn: 'Doi Saket',
    labelTh: 'ดอยสะเก็ด',
    pathD: 'M390 480 L465 450 L520 500 L500 590 L450 625 L420 615 L450 535 Z',
    labelX: 470,
    labelY: 535,
    typicalAreasEn: 'Doi Saket town and nearby areas in the Doi Saket checkout zone',
    typicalAreasTh: 'ตัวเมืองดอยสะเก็ดและพื้นที่ใกล้เคียงในโซนเช็กเอาต์ดอยสะเก็ด',
    checkoutZoneId: 'cm-doi-saket',
  },
  {
    id: 'mueang-chiang-mai',
    labelEn: 'Mueang Chiang Mai',
    labelTh: 'เมืองเชียงใหม่',
    pathD: 'M300 635 L345 575 L420 615 L410 685 L340 720 L285 685 Z',
    labelX: 352,
    labelY: 645,
    labelLine2Dy: 17,
    labelLinesEn: ['Mueang', 'Chiang Mai'],
    labelLinesTh: ['เมือง', 'เชียงใหม่'],
    typicalAreasEn:
      'Old City, Nimman, Chang Phueak, Suthep, Night Bazaar — fee depends on the exact checkout zone within Mueang',
    typicalAreasTh:
      'เมืองเก่า นิมมาน ช้างเผือก สุเทพ ไนท์บาซาร์ — ค่าจัดส่งขึ้นกับโซนเช็กเอาต์ภายในเมือง',
    checkoutZoneId: 'cm-mueang-central',
    relatedCheckoutZoneIds: [...MUEANG_CHECKOUT_ZONE_IDS],
  },
  {
    id: 'hang-dong',
    labelEn: 'Hang Dong',
    labelTh: 'หางดง',
    pathD: 'M230 590 L300 635 L285 685 L245 730 L180 700 L170 640 Z',
    labelX: 232,
    labelY: 665,
    typicalAreasEn: 'Hang Dong town and areas in the Hang Dong checkout zone',
    typicalAreasTh: 'ตัวเมืองหางดงและพื้นที่ในโซนเช็กเอาต์หางดง',
    checkoutZoneId: 'cm-hang-dong',
  },
  {
    id: 'saraphi',
    labelEn: 'Saraphi',
    labelTh: 'สารภี',
    pathD: 'M285 685 L340 720 L355 770 L300 795 L245 730 Z',
    labelX: 305,
    labelY: 750,
    typicalAreasEn: 'Saraphi town and areas in the Saraphi checkout zone',
    typicalAreasTh: 'ตัวเมืองสารภีและพื้นที่ในโซนเช็กเอาต์สารภี',
    checkoutZoneId: 'cm-saraphi',
  },
  {
    id: 'san-pa-tong',
    labelEn: 'San Pa Tong',
    labelTh: 'สันป่าตอง',
    pathD: 'M180 700 L245 730 L300 795 L255 840 L175 820 L140 760 Z',
    labelX: 220,
    labelY: 775,
    typicalAreasEn: 'San Pa Tong town and nearby — typically 20–25 km from central Chiang Mai',
    typicalAreasTh: 'ตัวเมืองสันป่าตองและใกล้เคียง — โดยทั่วไป 20–25 กม. จากใจกลางเชียงใหม่',
    checkoutZoneId: 'cm-san-pa-tong',
  },
  {
    id: 'mae-wang',
    labelEn: 'Mae Wang',
    labelTh: 'แม่วาง',
    pathD: 'M95 540 L145 610 L170 640 L180 700 L140 760 L75 725 L55 630 Z',
    labelX: 115,
    labelY: 655,
    typicalAreasEn: 'Mae Wang and western valleys',
    typicalAreasTh: 'แม่วางและหุบเขาตะวันตก',
    checkoutZoneId: 'cm-mae-wang',
  },
  {
    id: 'san-kamphaeng',
    labelEn: 'San Kamphaeng',
    labelTh: 'สันกำแพง',
    pathD: 'M410 685 L450 625 L500 590 L540 655 L500 720 L430 740 L355 770 L340 720 Z',
    labelX: 455,
    labelY: 690,
    typicalAreasEn: 'San Kamphaeng town and areas in the San Kamphaeng checkout zone',
    typicalAreasTh: 'ตัวเมืองสันกำแพงและพื้นที่ในโซนเช็กเอาต์สันกำแพง',
    checkoutZoneId: 'cm-san-kamphaeng',
  },
  {
    id: 'mae-on',
    labelEn: 'Mae On',
    labelTh: 'แม่ออน',
    pathD: 'M500 590 L560 575 L580 650 L540 705 L500 720 L540 655 Z',
    labelX: 535,
    labelY: 640,
    typicalAreasEn: 'Mae On and nearby destinations in the Mae On checkout zone',
    typicalAreasTh: 'แม่ออนและปลายทางใกล้เคียงในโซนเช็กเอาต์แม่ออน',
    checkoutZoneId: 'cm-mae-on',
  },
];

export const AMPHOE_MAP_OTHER: Omit<AmphoeMapDistrict, 'pathD' | 'labelX' | 'labelY'> = {
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
