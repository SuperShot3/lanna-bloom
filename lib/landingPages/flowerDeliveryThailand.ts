import type { Locale } from '@/lib/i18n';
import { CHIANG_MAI_DISTRICTS } from '@/lib/delivery-areas';
import { MARKETS } from '@/lib/delivery/markets';

export type LocalizedLabel = { nameEn: string; nameTh: string };

export type ThailandServiceArea = {
  nameEn: string;
  nameTh: string;
  href: (lang: Locale) => string;
  noteEn?: string;
  noteTh?: string;
};

/** All Chiang Mai province amphoe plus nearby Lamphun. */
export function getChiangMaiDeliveryDistricts(): LocalizedLabel[] {
  return [
    ...CHIANG_MAI_DISTRICTS.map((d) => ({ nameEn: d.nameEn, nameTh: d.nameTh })),
    { nameEn: 'Lamphun', nameTh: 'ลำพูน' },
  ];
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
    { nameEn: 'Mueang Lamphun', nameTh: 'เมืองลำพูน' },
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
    ...MARKETS.map((m) => ({
      nameEn: m.customerFacingNameEn,
      nameTh: m.customerFacingNameTh,
      href: (lang: Locale) => `/${lang}/${m.pathSlug}/flower-delivery`,
      noteEn: 'Bouquet delivery only',
      noteTh: 'จัดส่งช่อดอกไม้เท่านั้น',
    })),
  ];
}

export function getExpansionMarketAreas(): ThailandServiceArea[] {
  return MARKETS.map((m) => ({
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
};

const COPY: Record<'en' | 'th', FlowerDeliveryThailandCopy> = {
  en: {
    metaTitle: 'Flower Delivery in Thailand | Lanna Bloom',
    metaDescription:
      'Order flowers online with Lanna Bloom. Flower and gift delivery across Chiang Mai province — all districts, Old City, Nimman, Hang Dong, Mae Rim, San Sai, and more. Bouquet delivery in Phuket, Hua Hin, Koh Samui, Krabi & Ao Nang, and Pattaya.',
    h1: 'Flower delivery in Thailand',
    intro:
      'Lanna Bloom is a Chiang Mai flower and gift delivery service. Order online with secure checkout — we deliver across Chiang Mai city and province, plus selected destinations across Thailand.',
    areasTitle: 'Where we deliver',
    chiangMaiTitle: 'Chiang Mai',
    chiangMaiIntro:
      'Our home base. We deliver flowers and gifts across Chiang Mai city and all districts in Chiang Mai province, plus nearby Lamphun.',
    districtsSubtitle: 'Districts (amphoe)',
    neighborhoodsSubtitle: 'Popular areas & neighborhoods',
    chiangMaiNote:
      'Don’t see your exact street? Add your address at checkout — we deliver to hotels, condos, offices, and homes throughout the areas below.',
    otherDestinationsTitle: 'Other Thailand destinations',
    expandingNote:
      'Bouquet-only delivery in the destinations below. Nationwide coverage is not available yet.',
    ctaCatalog: 'Shop Chiang Mai',
    ctaChiangMaiGuide: 'Chiang Mai delivery guide',
    ctaDeliveryPolicy: 'Delivery policy',
  },
  th: {
    metaTitle: 'ส่งดอกไม้ทั่วประเทศไทย | Lanna Bloom',
    metaDescription:
      'สั่งดอกไม้ออนไลน์กับ Lanna Bloom จัดส่งดอกไม้และของขวัญทั่วจังหวัดเชียงใหม่ ครบทุกอำเภอ เมืองเก่า นิมมาน หางดง แม่ริม สันทราย และอื่นๆ รวมลำพูน จัดส่งช่อดอกไม้ในภูเก็ต หัวหิน เกาะสมุย กระบี่และอ่าวนาง และพัทยา',
    h1: 'บริการส่งดอกไม้ในประเทศไทย',
    intro:
      'Lanna Bloom ให้บริการส่งดอกไม้และของขวัญในเชียงใหม่ สั่งซื้อออนไลน์ชำระเงินปลอดภัย — เราจัดส่งทั่วเมืองและจังหวัดเชียงใหม่ รวมจุดหมายที่เลือกทั่วประเทศไทย',
    areasTitle: 'พื้นที่ที่ให้บริการ',
    chiangMaiTitle: 'เชียงใหม่',
    chiangMaiIntro:
      'ฐานให้บริการหลักของเรา จัดส่งดอกไม้และของขวัญทั่วเมืองเชียงใหม่ ครบทุกอำเภอในจังหวัดเชียงใหม่ และลำพูนใกล้เคียง',
    districtsSubtitle: 'อำเภอ',
    neighborhoodsSubtitle: 'ย่านและพื้นที่ยอดนิยม',
    chiangMaiNote:
      'ไม่เห็นถนนของคุณในรายการ? กรอกที่อยู่ตอนชำระเงินได้เลย — เราจัดส่งไปโรงแรม คอนโด ออฟฟิศ และบ้านในพื้นที่ด้านล่าง',
    otherDestinationsTitle: 'จุดหมายอื่นในประเทศไทย',
    expandingNote:
      'จัดส่งช่อดอกไม้เท่านั้นในจุดหมายด้านล่าง ยังไม่มีบริการทั่วทั้งประเทศ',
    ctaCatalog: 'เลือกซื้อเชียงใหม่',
    ctaChiangMaiGuide: 'คู่มือจัดส่งเชียงใหม่',
    ctaDeliveryPolicy: 'นโยบายการจัดส่ง',
  },
};

export function getFlowerDeliveryThailandCopy(lang: Locale): FlowerDeliveryThailandCopy {
  if (lang === 'th') return COPY.th;
  return COPY.en;
}
