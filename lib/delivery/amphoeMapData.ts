/**
 * Simplified Chiang Mai amphoe map data for the interactive delivery district map.
 * SVG paths are schematic (not official boundaries).
 */

import { feeTierFillColor } from '@/lib/delivery/distanceTiers';

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
  feeFrom: number;
  feeTo: number | null;
  typicalAreasEn: string;
  typicalAreasTh: string;
  /** Primary checkout zone id when selectable at checkout */
  checkoutZoneId?: string;
  /** Requires manual quote — not in checkout dropdown */
  manualQuote?: boolean;
  fill: string;
}

export const PROVINCE_OUTLINE_D =
  'M390 30 L500 25 L550 75 L520 145 L460 165 L420 230 L440 330 L420 455 L465 450 L520 500 L500 590 L560 575 L580 650 L540 705 L500 720 L430 740 L355 770 L300 795 L255 840 L175 820 L140 760 L75 725 L55 630 L95 540 L120 470 L190 420 L235 300 L260 220 L300 145 L330 55 Z';

export const AMPHOE_MAP_DISTRICTS: AmphoeMapDistrict[] = [
  {
    id: 'mae-ai',
    labelEn: 'Mae Ai',
    labelTh: 'แม่เอ๋ย',
    pathD: 'M390 30 L500 25 L550 75 L520 145 L460 165 L405 130 Z',
    labelX: 470,
    labelY: 95,
    feeFrom: 950,
    feeTo: null,
    typicalAreasEn: 'Northern Chiang Mai — contact us for route-based pricing (45+ km from Warorot)',
    typicalAreasTh: 'เชียงใหม่เหนือ — ติดต่อเราเพื่อยืนยันค่าจัดส่งตามเส้นทาง (มากกว่า 45 กม. จากวโรรส)',
    manualQuote: true,
    fill: feeTierFillColor(null),
  },
  {
    id: 'fang',
    labelEn: 'Fang',
    labelTh: 'ฝาง',
    pathD: 'M330 55 L390 30 L405 130 L460 165 L420 230 L335 210 L300 145 Z',
    labelX: 370,
    labelY: 145,
    feeFrom: 950,
    feeTo: null,
    typicalAreasEn: 'Fang district — manual confirmation required before ordering',
    typicalAreasTh: 'อำเภอฝาง — ต้องยืนยันกับทีมก่อนสั่งซื้อ',
    manualQuote: true,
    fill: feeTierFillColor(null),
  },
  {
    id: 'chiang-dao',
    labelEn: 'Chiang Dao',
    labelTh: 'เชียงดาว',
    pathD: 'M260 220 L335 210 L420 230 L440 330 L390 395 L280 370 L235 300 Z',
    labelX: 350,
    labelY: 305,
    feeFrom: 950,
    feeTo: 950,
    typicalAreasEn: 'Chiang Dao town and nearby — typically 40–45 km from central Chiang Mai',
    typicalAreasTh: 'ตัวเมืองเชียงดาวและใกล้เคียง — โดยทั่วไป 40–45 กม. จากใจกลางเชียงใหม่',
    checkoutZoneId: 'cm-chiang-dao',
    fill: feeTierFillColor(950),
  },
  {
    id: 'mae-taeng',
    labelEn: 'Mae Taeng',
    labelTh: 'แม่แตง',
    pathD: 'M235 300 L280 370 L390 395 L420 455 L360 520 L245 500 L190 420 Z',
    labelX: 305,
    labelY: 430,
    feeFrom: 850,
    feeTo: 950,
    typicalAreasEn: 'Mae Taeng town, Mon Cham vicinity — fee depends on exact route',
    typicalAreasTh: 'ตัวเมืองแม่แตง บริเวณม่อนแจ่ม — ค่าจัดส่งขึ้นกับเส้นทางจริง',
    checkoutZoneId: 'cm-mae-taeng',
    fill: feeTierFillColor(850),
  },
  {
    id: 'samoeng',
    labelEn: 'Samoeng',
    labelTh: 'สะเมิง',
    pathD: 'M120 470 L190 420 L245 500 L230 590 L145 610 L95 540 Z',
    labelX: 165,
    labelY: 535,
    feeFrom: 950,
    feeTo: 950,
    typicalAreasEn: 'Samoeng town and remote western areas — typically 40+ km',
    typicalAreasTh: 'ตัวเมืองสะเมิงและพื้นที่ตะวันตกห่างไกล — โดยทั่วไปมากกว่า 40 กม.',
    checkoutZoneId: 'cm-samoeng',
    fill: feeTierFillColor(950),
  },
  {
    id: 'mae-rim',
    labelEn: 'Mae Rim',
    labelTh: 'แม่ริม',
    pathD: 'M245 500 L320 505 L345 575 L300 635 L230 590 Z',
    labelX: 285,
    labelY: 555,
    feeFrom: 450,
    feeTo: 950,
    typicalAreasEn: 'Mae Rim town (฿450) to mountain areas (up to ฿950 depending on route)',
    typicalAreasTh: 'ตัวเมืองแม่ริม (฿450) ถึงพื้นที่บนเขา (สูงสุด ฿950 ตามเส้นทาง)',
    checkoutZoneId: 'cm-mae-rim',
    fill: feeTierFillColor(450),
  },
  {
    id: 'san-sai',
    labelEn: 'San Sai',
    labelTh: 'สันทราย',
    pathD: 'M320 505 L390 480 L450 535 L420 615 L345 575 Z',
    labelX: 390,
    labelY: 550,
    feeFrom: 350,
    feeTo: 550,
    typicalAreasEn: 'Southern San Sai near city (฿350) to outer areas (up to ฿550)',
    typicalAreasTh: 'สันทรายใต้ใกล้เมือง (฿350) ถึงชานนอก (สูงสุด ฿550)',
    checkoutZoneId: 'cm-san-sai',
    fill: feeTierFillColor(400),
  },
  {
    id: 'doi-saket',
    labelEn: 'Doi Saket',
    labelTh: 'ดอยสะเก็ด',
    pathD: 'M390 480 L465 450 L520 500 L500 590 L450 625 L420 615 L450 535 Z',
    labelX: 470,
    labelY: 535,
    feeFrom: 450,
    feeTo: 850,
    typicalAreasEn: 'Near town (฿450) to outer Doi Saket and remote areas (up to ฿850)',
    typicalAreasTh: 'ใกล้ตัวเมือง (฿450) ถึงดอยสะเก็ดชานนอกและห่างไกล (สูงสุด ฿850)',
    checkoutZoneId: 'cm-doi-saket',
    fill: feeTierFillColor(550),
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
    feeFrom: 250,
    feeTo: 350,
    typicalAreasEn:
      'Old City, Nimman, Chang Phueak, Suthep, Night Bazaar — ฿250 central to ฿350 outer Mueang',
    typicalAreasTh:
      'เมืองเก่า นิมมาน ช้างเผือก สุเทพ ไนท์บาซาร์ — ฿250 ใจกลาง ถึง ฿350 ชานเมือง',
    checkoutZoneId: 'cm-mueang-central',
    fill: feeTierFillColor(250),
  },
  {
    id: 'hang-dong',
    labelEn: 'Hang Dong',
    labelTh: 'หางดง',
    pathD: 'M230 590 L300 635 L285 685 L245 730 L180 700 L170 640 Z',
    labelX: 232,
    labelY: 665,
    feeFrom: 400,
    feeTo: 750,
    typicalAreasEn: 'Northern Hang Dong (฿400) to town and outer areas (up to ฿750)',
    typicalAreasTh: 'หางดงเหนือ (฿400) ถึงตัวเมืองและชานนอก (สูงสุด ฿750)',
    checkoutZoneId: 'cm-hang-dong',
    fill: feeTierFillColor(450),
  },
  {
    id: 'saraphi',
    labelEn: 'Saraphi',
    labelTh: 'สารภี',
    pathD: 'M285 685 L340 720 L355 770 L300 795 L245 730 Z',
    labelX: 305,
    labelY: 750,
    feeFrom: 350,
    feeTo: 550,
    typicalAreasEn: 'Northern Saraphi near city (฿350) to town area (฿400–฿550)',
    typicalAreasTh: 'สารภีเหนือใกล้เมือง (฿350) ถึงตัวเมือง (฿400–฿550)',
    checkoutZoneId: 'cm-saraphi',
    fill: feeTierFillColor(400),
  },
  {
    id: 'san-pa-tong',
    labelEn: 'San Pa Tong',
    labelTh: 'สันป่าตอง',
    pathD: 'M180 700 L245 730 L300 795 L255 840 L175 820 L140 760 Z',
    labelX: 220,
    labelY: 775,
    feeFrom: 550,
    feeTo: 550,
    typicalAreasEn: 'San Pa Tong town and nearby — typically 20–25 km from central Chiang Mai',
    typicalAreasTh: 'ตัวเมืองสันป่าตองและใกล้เคียง — โดยทั่วไป 20–25 กม. จากใจกลางเชียงใหม่',
    checkoutZoneId: 'cm-san-pa-tong',
    fill: feeTierFillColor(550),
  },
  {
    id: 'mae-wang',
    labelEn: 'Mae Wang',
    labelTh: 'แม่วาง',
    pathD: 'M95 540 L145 610 L170 640 L180 700 L140 760 L75 725 L55 630 Z',
    labelX: 115,
    labelY: 655,
    feeFrom: 750,
    feeTo: 950,
    typicalAreasEn: 'Mae Wang and western valleys — typically 30–45 km depending on destination',
    typicalAreasTh: 'แม่วางและหุบเขาตะวันตก — โดยทั่วไป 30–45 กม. ตามปลายทาง',
    checkoutZoneId: 'cm-mae-wang',
    fill: feeTierFillColor(750),
  },
  {
    id: 'san-kamphaeng',
    labelEn: 'San Kamphaeng',
    labelTh: 'สันกำแพง',
    pathD: 'M410 685 L450 625 L500 590 L540 655 L500 720 L430 740 L355 770 L340 720 Z',
    labelX: 455,
    labelY: 690,
    feeFrom: 450,
    feeTo: 750,
    typicalAreasEn: 'San Kamphaeng town (฿450) to Hot Springs area (up to ฿750)',
    typicalAreasTh: 'ตัวเมืองสันกำแพง (฿450) ถึงบ่อน้ำร้อน (สูงสุด ฿750)',
    checkoutZoneId: 'cm-san-kamphaeng',
    fill: feeTierFillColor(450),
  },
  {
    id: 'mae-on',
    labelEn: 'Mae On',
    labelTh: 'แม่ออน',
    pathD: 'M500 590 L560 575 L580 650 L540 705 L500 720 L540 655 Z',
    labelX: 535,
    labelY: 640,
    feeFrom: 650,
    feeTo: 950,
    typicalAreasEn: 'Mae On approaches (฿650) to remote mountain destinations (up to ฿950)',
    typicalAreasTh: 'แนวเข้าแม่ออน (฿650) ถึงปลายทางบนเขาห่างไกล (สูงสุด ฿950)',
    checkoutZoneId: 'cm-mae-on',
    fill: feeTierFillColor(750),
  },
];

export const AMPHOE_MAP_OTHER: Omit<AmphoeMapDistrict, 'pathD' | 'labelX' | 'labelY' | 'fill'> = {
  id: 'other',
  labelEn: 'My location is not listed',
  labelTh: 'พื้นที่ของฉันไม่อยู่ในรายการ',
  feeFrom: 550,
  feeTo: null,
  typicalAreasEn:
    'Paste your Google Maps pin at checkout or message us — we confirm the zone and fee before delivery.',
  typicalAreasTh:
    'วางหมุด Google Maps ตอนเช็กเอาต์หรือทักเรา — เรายืนยันโซนและค่าจัดส่งก่อนส่ง',
};

export function getAmphoeById(id: AmphoeMapId): AmphoeMapDistrict | undefined {
  return AMPHOE_MAP_DISTRICTS.find((d) => d.id === id);
}
