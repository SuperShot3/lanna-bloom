import type { Locale } from '@/lib/i18n';
import { CHIANG_MAI_DISTRICTS } from '@/lib/delivery-areas';
import { getActiveMarkets } from '@/lib/delivery/markets';

export type LocalizedLabel = { nameEn: string; nameTh: string };

export type ThailandServiceArea = {
  nameEn: string;
  nameTh: string;
  href: (lang: Locale) => string;
  noteEn?: string;
  noteTh?: string;
};

/** Chiang Mai province amphoe only (Lamphun is its own province on the national map). */
export function getChiangMaiDeliveryDistricts(): LocalizedLabel[] {
  return CHIANG_MAI_DISTRICTS.map((d) => ({ nameEn: d.nameEn, nameTh: d.nameTh }));
}

/** Popular tambons, towns, and neighborhoods we regularly deliver to. */
export function getChiangMaiDeliveryNeighborhoods(): LocalizedLabel[] {
  return [
    { nameEn: 'Old City & Nimman', nameTh: 'เมืองเก่าและนิมมาน' },
    { nameEn: 'Chang Phueak', nameTh: 'ช้างเผือก' },
    { nameEn: 'Suthep', nameTh: 'สุเทพ' },
    { nameEn: 'Nong Pa Khrang', nameTh: 'หนองป่าคร้าง' },
    { nameEn: 'Fa Ham', nameTh: 'ฟ้าฮ่าม' },
    { nameEn: 'Mae Hia', nameTh: 'แม่เหียะ' },
    { nameEn: 'Nong Hoi', nameTh: 'หนองหอย' },
    { nameEn: 'Haiya', nameTh: 'หายญา' },
    { nameEn: 'Chang Moi', nameTh: 'ช้างม่อย' },
    { nameEn: 'Tha Sala', nameTh: 'ท่าศาลา' },
    { nameEn: 'San Phisuea', nameTh: 'สันผีเสื้อ' },
    { nameEn: 'Pa Daet', nameTh: 'ป่าแดด' },
    { nameEn: 'San Sai Noi', nameTh: 'สันทรายน้อย' },
    { nameEn: 'San Sai Luang', nameTh: 'สันทรายหลวง' },
    { nameEn: 'Nong Chom', nameTh: 'หนองจ๊อม' },
    { nameEn: 'Don Kaeo', nameTh: 'ดอนแก้ว' },
    { nameEn: 'Bo Sang', nameTh: 'บ่อสร้าง' },
    { nameEn: 'Luang Nuea', nameTh: 'หลวงเหนือ' },
    { nameEn: 'Yu Wa', nameTh: 'ยุวะ' },
  ];
}

export function getThailandServiceAreas(): ThailandServiceArea[] {
  return [
    {
      nameEn: 'Chiang Mai',
      nameTh: 'เชียงใหม่',
      href: (lang) => `/${lang}/catalog`,
      noteEn: 'Full flower & gift catalog · same-day when available',
      noteTh: 'ดอกไม้และของขวัญครบ · จัดส่งวันเดียวได้ตามเงื่อนไข',
    },
    ...getActiveMarkets().map((m) => ({
      nameEn: m.customerFacingNameEn,
      nameTh: m.customerFacingNameTh,
      href: (lang: Locale) => `/${lang}/${m.pathSlug}/flower-delivery`,
      noteEn: 'Bouquet delivery only',
      noteTh: 'จัดส่งช่อดอกไม้เท่านั้น',
    })),
  ];
}

export function getExpansionMarketAreas(): ThailandServiceArea[] {
  return getActiveMarkets().map((m) => ({
    nameEn: m.customerFacingNameEn,
    nameTh: m.customerFacingNameTh,
    href: (lang: Locale) => `/${lang}/${m.pathSlug}/flower-delivery`,
    noteEn: 'Bouquet delivery only',
    noteTh: 'จัดส่งช่อดอกไม้เท่านั้น',
  }));
}

export type FlowerDeliveryThailandCopy = {
  metaTitle: string;
  metaDescription: string;
  h1: string;
  mapHint: string;
  intro: string;
  areasTitle: string;
  chiangMaiTitle: string;
  chiangMaiIntro: string;
  districtsSubtitle: string;
  neighborhoodsSubtitle: string;
  chiangMaiNote: string;
  otherDestinationsTitle: string;
  expandingNote: string;
  ctaCatalog: string;
  ctaChiangMaiGuide: string;
  ctaDeliveryPolicy: string;
  ctaAbroad: string;
};

const COPY: Record<'en' | 'th', FlowerDeliveryThailandCopy> = {
  en: {
    metaTitle: 'Flower Delivery Coverage in Thailand & Chiang Mai Fees | Lanna Bloom',
    metaDescription:
      'See live Thailand flower-delivery coverage by province, then check Chiang Mai district fees — Hang Dong, Mae Rim, Fang, Mae Ai, and more. Gradual expansion; nationwide same-day is not promised.',
    h1: 'Flower delivery across Thailand — Chiang Mai fees & coverage',
    mapHint: 'Tap a province for live status. Tap Chiang Mai for district fees.',
    intro:
      'Lanna Bloom is expanding flower and gift delivery across Thailand, province by province. Chiang Mai remains our reliable full-service home base — select a district on the fee map for estimated delivery costs across central, outer, and rural areas including Hang Dong, Mae Rim, Fang, and Mae Ai. We expand gradually — nationwide same-day is not promised.',
    areasTitle: 'Chiang Mai — our full-service core',
    chiangMaiTitle: 'Chiang Mai',
    chiangMaiIntro:
      'Our home base. We deliver flowers and gifts across Chiang Mai — including Hang Dong, Mae Ai, Fang, and the districts and neighborhoods listed below.',
    districtsSubtitle: 'Districts (amphoe)',
    neighborhoodsSubtitle: 'Popular areas & neighborhoods',
    chiangMaiNote:
      'Don’t see your exact street? Add your address at checkout — we deliver to hotels, condos, offices, and homes throughout the areas below.',
    otherDestinationsTitle: 'Currently shoppable provinces',
    expandingNote:
      'Only provinces where ordering is open right now. Status and categories come from live settings — we do not promise nationwide same-day delivery.',
    ctaCatalog: 'Buy flowers',
    ctaChiangMaiGuide: 'Chiang Mai delivery guide',
    ctaDeliveryPolicy: 'Delivery policy',
    ctaAbroad: 'Send flowers from abroad',
  },
  th: {
    metaTitle: 'พื้นที่จัดส่งดอกไม้ทั่วไทย และค่าส่งเชียงใหม่ | Lanna Bloom',
    metaDescription:
      'ดูสถานะจัดส่งดอกไม้รายจังหวัดทั่วไทยแบบสด แล้วตรวจสอบค่าส่งรายอำเภอในเชียงใหม่ รวมหางดง แม่ริม ฝาง และแม่เอ๋ย ขยายบริการอย่างค่อยเป็นค่อยไป — ไม่รับประกันจัดส่งวันเดียวกันทั่วประเทศ',
    h1: 'จัดส่งดอกไม้ทั่วไทย — ค่าส่งและพื้นที่เชียงใหม่',
    mapHint: 'แตะจังหวัดเพื่อดูสถานะ — แตะเชียงใหม่เพื่อดูค่าส่งรายอำเภอ',
    intro:
      'Lanna Bloom กำลังขยายบริการจัดส่งดอกไม้และของขวัญทั่วไทยทีละจังหวัด เชียงใหม่ยังเป็นฐานบริการหลักที่ครบวงจร — เลือกอำเภอบนแผนที่ค่าส่งเพื่อดูค่าจัดส่งโดยประมาณ ทั้งในเมือง รอบเมือง และพื้นที่ชนบท รวมหางดง แม่ริม ฝาง และแม่เอ๋ย ขยายอย่างค่อยเป็นค่อยไป — ไม่รับประกันจัดส่งวันเดียวกันทั่วประเทศ',
    areasTitle: 'เชียงใหม่ — ฐานบริการหลักครบวงจร',
    chiangMaiTitle: 'เชียงใหม่',
    chiangMaiIntro:
      'ฐานให้บริการหลักของเรา จัดส่งดอกไม้และของขวัญทั่วเชียงใหม่ รวมหางดง แม่เอ๋ย ฝาง และอำเภอ/ย่านด้านล่าง',
    districtsSubtitle: 'อำเภอ',
    neighborhoodsSubtitle: 'ย่านและพื้นที่ยอดนิยม',
    chiangMaiNote:
      'ไม่เห็นถนนของคุณในรายการ? กรอกที่อยู่ตอนชำระเงินได้เลย — เราจัดส่งไปโรงแรม คอนโด ออฟฟิศ และบ้านในพื้นที่ด้านล่าง',
    otherDestinationsTitle: 'จังหวัดที่สั่งได้ตอนนี้',
    expandingNote:
      'แสดงเฉพาะจังหวัดที่เปิดรับออเดอร์ สถานะและหมวดสินค้ามาจากการตั้งค่าจริง — ไม่รับประกันจัดส่งวันเดียวกันทั่วประเทศ',
    ctaCatalog: 'ซื้อดอกไม้',
    ctaChiangMaiGuide: 'คู่มือจัดส่งเชียงใหม่',
    ctaDeliveryPolicy: 'นโยบายการจัดส่ง',
    ctaAbroad: 'ส่งดอกไม้จากต่างประเทศ',
  },
};

export function getFlowerDeliveryThailandCopy(lang: Locale): FlowerDeliveryThailandCopy {
  if (lang === 'th') return COPY.th;
  return COPY.en;
}
