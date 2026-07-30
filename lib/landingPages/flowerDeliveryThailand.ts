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
    metaTitle: 'Flower Delivery Fees & Areas in Chiang Mai | Lanna Bloom',
    metaDescription:
      'Flower delivery across central, outer, and rural Chiang Mai — including Hang Dong, Mae Rim, San Sai, Doi Saket, Mae Taeng, Chiang Dao, Fang, and Mae Ai. Check the map for coverage and estimated fees.',
    h1: 'Flower delivery areas and fees in Chiang Mai',
    intro:
      'Lanna Bloom delivers flowers across central, outer, and rural Chiang Mai. We cover areas including Hang Dong, Mae Rim, San Sai, Doi Saket, San Kamphaeng, Saraphi, Mae Taeng, Chiang Dao, Fang, and Mae Ai — as well as city neighbourhoods such as the Old City and Nimman. Select your district on the map to check delivery coverage and see an estimated fee. For remote addresses, we confirm the route and final fee before delivery.',
    areasTitle: 'Where we deliver in Chiang Mai',
    chiangMaiTitle: 'Chiang Mai',
    chiangMaiIntro:
      'Our home base. We deliver flowers and gifts across Chiang Mai — including Hang Dong, Mae Ai, Fang, and the areas listed below — plus nearby Lamphun.',
    districtsSubtitle: 'Districts (amphoe)',
    neighborhoodsSubtitle: 'Popular areas & neighborhoods',
    chiangMaiNote:
      'Don’t see your exact street? Add your address at checkout — we deliver to hotels, condos, offices, and homes throughout the areas below.',
    otherDestinationsTitle: 'Other Thailand destinations',
    expandingNote:
      'Bouquet-only delivery in the destinations below. Nationwide coverage is not available yet.',
    ctaCatalog: 'Buy flowers',
    ctaChiangMaiGuide: 'Chiang Mai delivery guide',
    ctaDeliveryPolicy: 'Delivery policy',
    ctaAbroad: 'Send flowers from abroad',
  },
  th: {
    metaTitle: 'ค่าส่งและพื้นที่จัดส่งดอกไม้เชียงใหม่ | Lanna Bloom',
    metaDescription:
      'จัดส่งดอกไม้ทั้งในเมือง รอบเมือง และพื้นที่ชนบทของเชียงใหม่ รวมหางดง แม่ริม สันทราย ดอยสะเก็ด แม่แตง เชียงดาว ฝาง และแม่เอ๋ย ตรวจสอบพื้นที่และค่าส่งโดยประมาณบนแผนที่',
    h1: 'พื้นที่จัดส่งและค่าส่งดอกไม้ในเชียงใหม่',
    intro:
      'Lanna Bloom จัดส่งดอกไม้ทั้งในเมือง รอบเมือง และพื้นที่ชนบทของเชียงใหม่ ครอบคลุมหางดง แม่ริม สันทราย ดอยสะเก็ด สันกำแพง สารภี แม่แตง เชียงดาว ฝาง และแม่เอ๋ย รวมถึงย่านในเมืองอย่างเมืองเก่าและนิมมาน เลือกอำเภอบนแผนที่เพื่อตรวจสอบพื้นที่จัดส่งและดูค่าส่งโดยประมาณ สำหรับที่อยู่ห่างไกล เราจะยืนยันเส้นทางและค่าส่งสุดท้ายก่อนจัดส่ง',
    areasTitle: 'เราจัดส่งที่ไหนในเชียงใหม่',
    chiangMaiTitle: 'เชียงใหม่',
    chiangMaiIntro:
      'ฐานให้บริการหลักของเรา จัดส่งดอกไม้และของขวัญทั่วเชียงใหม่ รวมหางดง แม่เอ๋ย ฝาง และพื้นที่ด้านล่าง รวมลำพูนใกล้เคียง',
    districtsSubtitle: 'อำเภอ',
    neighborhoodsSubtitle: 'ย่านและพื้นที่ยอดนิยม',
    chiangMaiNote:
      'ไม่เห็นถนนของคุณในรายการ? กรอกที่อยู่ตอนชำระเงินได้เลย — เราจัดส่งไปโรงแรม คอนโด ออฟฟิศ และบ้านในพื้นที่ด้านล่าง',
    otherDestinationsTitle: 'จุดหมายอื่นในประเทศไทย',
    expandingNote:
      'จัดส่งช่อดอกไม้เท่านั้นในจุดหมายด้านล่าง ยังไม่มีบริการทั่วทั้งประเทศ',
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
