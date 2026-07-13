/**
 * Distance-based delivery fee tiers from Warorot Market (Chiang Mai).
 * Used for map display and reference table — checkout uses zone ids in zones.ts.
 */

export interface DeliveryDistanceTier {
  id: string;
  /** e.g. "0–5 km" */
  distanceLabelEn: string;
  distanceLabelTh: string;
  feeThb: number | null;
  /** null fee = manual confirmation required */
  typicalAreasEn: string;
  typicalAreasTh: string;
}

export const DELIVERY_DISTANCE_TIERS: DeliveryDistanceTier[] = [
  {
    id: 'tier-0-5',
    distanceLabelEn: '0–5 km',
    distanceLabelTh: '0–5 กม.',
    feeThb: 250,
    typicalAreasEn:
      'Chiang Mai central: Chang Moi, Wat Ket, Night Bazaar, Tha Phae, Old City, Chang Khlan, parts of Santitham and Nong Pa Khrang',
    typicalAreasTh:
      'ใจกลางเชียงใหม่: ช้างม่อย วัดเกต ไนท์บาซาร์ ท่าแพ เมืองเก่า ช้างคลาน บางส่วนสันติธรรมและหนองป่าคร้าง',
  },
  {
    id: 'tier-5-8',
    distanceLabelEn: 'More than 5–8 km',
    distanceLabelTh: 'มากกว่า 5–8 กม.',
    feeThb: 300,
    typicalAreasEn:
      'Nimman, Chang Phueak, Suthep urban area, Chiang Mai Airport area, Nong Pa Khrang outer area, parts of Fa Ham and Nong Hoi',
    typicalAreasTh:
      'นิมมาน ช้างเผือก สุเทพในเมือง พื้นที่สนามบิน หนองป่าคร้างชานเมือง บางส่วนฟ้าฮ่ามและหนองหอย',
  },
  {
    id: 'tier-8-12',
    distanceLabelEn: 'More than 8–12 km',
    distanceLabelTh: 'มากกว่า 8–12 กม.',
    feeThb: 350,
    typicalAreasEn:
      'Mae Hia, Nong Chom near city, Don Kaeo near city, northern Saraphi, southern San Sai, outer Suthep',
    typicalAreasTh:
      'แม่เหียะ หนองจอมใกล้เมือง ดอนแก้วใกล้เมือง สารภีเหนือ สันทรายใต้ สุเทพชานเมือง',
  },
  {
    id: 'tier-12-16',
    distanceLabelEn: 'More than 12–16 km',
    distanceLabelTh: 'มากกว่า 12–16 กม.',
    feeThb: 400,
    typicalAreasEn:
      'Saraphi town area, Hang Dong northern area, San Sai town area, Don Kaeo outer area, Mae Rim southern area',
    typicalAreasTh:
      'ตัวเมืองสารภี หางดงเหนือ ตัวเมืองสันทราย ดอนแก้วชานนอก แม่ริมใต้',
  },
  {
    id: 'tier-16-20',
    distanceLabelEn: 'More than 16–20 km',
    distanceLabelTh: 'มากกว่า 16–20 กม.',
    feeThb: 450,
    typicalAreasEn:
      'Mae Rim town, Hang Dong town, San Kamphaeng town, parts of San Sai and Saraphi, Doi Saket near town',
    typicalAreasTh:
      'ตัวเมืองแม่ริม หางดง สันกำแพง บางส่วนสันทรายและสารภี ดอยสะเก็ดใกล้ตัวเมือง',
  },
  {
    id: 'tier-20-25',
    distanceLabelEn: 'More than 20–25 km',
    distanceLabelTh: 'มากกว่า 20–25 กม.',
    feeThb: 550,
    typicalAreasEn:
      'Outer Hang Dong, outer San Sai, Doi Saket town and nearby areas, northern Lamphun Province, outer San Kamphaeng',
    typicalAreasTh:
      'หางดงชานนอก สันทรายชานนอก ตัวเมืองดอยสะเก็ด ลำพูนเหนือ สันกำแพงชานนอก',
  },
  {
    id: 'tier-25-30',
    distanceLabelEn: 'More than 25–30 km',
    distanceLabelTh: 'มากกว่า 25–30 กม.',
    feeThb: 650,
    typicalAreasEn:
      'Lamphun city area, outer Doi Saket, some Mae On approaches, distant parts of Hang Dong and San Kamphaeng',
    typicalAreasTh:
      'ตัวเมืองลำพูน ดอยสะเก็ดชานนอก แนวเข้าแม่ออน หางดงและสันกำแพงห่างไกล',
  },
  {
    id: 'tier-30-35',
    distanceLabelEn: 'More than 30–35 km',
    distanceLabelTh: 'มากกว่า 30–35 กม.',
    feeThb: 750,
    typicalAreasEn:
      'San Kamphaeng Hot Springs area, Mae On near areas, outer Lamphun, some lower Mae Rim mountain areas',
    typicalAreasTh:
      'บ่อน้ำร้อนสันกำแพง แม่ออนใกล้ ลำพูนชานนอก แม่ริมเขาต่ำ',
  },
  {
    id: 'tier-35-40',
    distanceLabelEn: 'More than 35–40 km',
    distanceLabelTh: 'มากกว่า 35–40 กม.',
    feeThb: 850,
    typicalAreasEn:
      'Mae Taeng town, Mon Cham vicinity depending on route, outer Mae On and remote Doi Saket areas',
    typicalAreasTh:
      'ตัวเมืองแม่แตง ม่อนแจ่มตามเส้นทาง แม่ออนชานนอก ดอยสะเก็ดห่างไกล',
  },
  {
    id: 'tier-40-45',
    distanceLabelEn: 'More than 40–45 km',
    distanceLabelTh: 'มากกว่า 40–45 กม.',
    feeThb: 950,
    typicalAreasEn:
      'Samoeng town, some remote Mae Rim, Mae On and Mae Taeng destinations',
    typicalAreasTh:
      'ตัวเมืองสะเมิง แม่ริมห่างไกล แม่ออนและแม่แตงปลายทาง',
  },
  {
    id: 'tier-45-plus',
    distanceLabelEn: 'More than 45 km',
    distanceLabelTh: 'มากกว่า 45 กม.',
    feeThb: null,
    typicalAreasEn:
      'Remote Samoeng, Mae Kampong, distant Mae Taeng, mountain resorts, remote Lamphun and other unmapped destinations',
    typicalAreasTh:
      'สะเมิงห่างไกล แม่กำปอง แม่แตงไกล รีสอร์ทบนเขา ลำพูนห่างไกลและปลายทางอื่นๆ',
  },
];

/**
 * Fill color by fee tier for map districts.
 * Soft sage → champagne → terracotta → muted plum — readable and on-brand.
 */
export function feeTierFillColor(feeThb: number | null): string {
  if (feeThb == null) return '#c6b8ab';
  if (feeThb <= 250) return '#9fcbb4';
  if (feeThb <= 300) return '#b0d4a8';
  if (feeThb <= 350) return '#c4dba0';
  if (feeThb <= 400) return '#d5dd9c';
  if (feeThb <= 450) return '#e4d094';
  if (feeThb <= 550) return '#e8c08a';
  if (feeThb <= 650) return '#e0aa8e';
  if (feeThb <= 750) return '#d49896';
  if (feeThb <= 850) return '#c090a4';
  return '#a890b0';
}

export function formatFeeRange(
  feeFrom: number,
  feeTo: number | null,
  lang: 'en' | 'th'
): string {
  const prefix = lang === 'th' ? '฿' : '฿';
  if (feeTo == null || feeFrom === feeTo) {
    return `${prefix}${feeFrom.toLocaleString()}`;
  }
  return `${prefix}${feeFrom.toLocaleString()}–${prefix}${feeTo.toLocaleString()}`;
}
