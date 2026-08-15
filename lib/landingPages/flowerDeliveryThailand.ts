import type { Locale } from '@/lib/i18n';
import { CHIANG_MAI_DISTRICTS } from '@/lib/delivery-areas';
import { getActiveMarkets } from '@/lib/delivery/markets';
import { CHON_BURI_AMPHOE_MAP_DISTRICTS } from '@/lib/delivery/chonBuriAmphoeMapData';
import { LAMPHUN_AMPHOE_MAP_DISTRICTS } from '@/lib/delivery/lamphunAmphoeMapData';
import { PHUKET_AMPHOE_MAP_DISTRICTS } from '@/lib/delivery/phuketAmphoeMapData';

export type LocalizedLabel = { nameEn: string; nameTh: string };

export type ThailandServiceArea = {
  nameEn: string;
  nameTh: string;
  href: (lang: Locale) => string;
};

/** Chiang Mai province amphoe only (Lamphun is its own province on the national map). */
export function getChiangMaiDeliveryDistricts(): LocalizedLabel[] {
  return CHIANG_MAI_DISTRICTS.map((d) => ({ nameEn: d.nameEn, nameTh: d.nameTh }));
}

/** Lamphun amphoes for coverage SEO + customer transparency. */
export function getLamphunDeliveryDistricts(): LocalizedLabel[] {
  return LAMPHUN_AMPHOE_MAP_DISTRICTS.map((d) => ({
    nameEn: d.labelEn,
    nameTh: d.labelTh,
  }));
}

/** Pattaya checkout areas (city market — not the rest of Chon Buri). */
export function getPattayaDeliveryDistricts(): LocalizedLabel[] {
  return CHON_BURI_AMPHOE_MAP_DISTRICTS.map((d) => ({
    nameEn: d.labelEn,
    nameTh: d.labelTh,
  }));
}

/** Phuket listed checkout areas (city market — island tambons, not amphoe blobs). */
export function getPhuketDeliveryDistricts(): LocalizedLabel[] {
  return PHUKET_AMPHOE_MAP_DISTRICTS.map((d) => ({
    nameEn: d.labelEn,
    nameTh: d.labelTh,
  }));
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

/** Market links only — summaries come from listShoppableCoverageAreas (status/categories/fees). */
export function getThailandServiceAreas(): ThailandServiceArea[] {
  return [
    {
      nameEn: 'Chiang Mai',
      nameTh: 'เชียงใหม่',
      href: (lang) => `/${lang}/catalog`,
    },
    ...getActiveMarkets().map((m) => ({
      nameEn: m.customerFacingNameEn,
      nameTh: m.customerFacingNameTh,
      href: (lang: Locale) => `/${lang}/${m.pathSlug}/flower-delivery`,
    })),
  ];
}

export function getExpansionMarketAreas(): ThailandServiceArea[] {
  return getActiveMarkets().map((m) => ({
    nameEn: m.customerFacingNameEn,
    nameTh: m.customerFacingNameTh,
    href: (lang: Locale) => `/${lang}/${m.pathSlug}/flower-delivery`,
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
  lamphunTitle: string;
  lamphunIntro: string;
  lamphunNote: string;
  pattayaTitle: string;
  pattayaIntro: string;
  pattayaNote: string;
  phuketTitle: string;
  phuketIntro: string;
  phuketNote: string;
  otherDestinationsTitle: string;
  expandingNote: string;
  ctaChiangMai: string;
  ctaDeliveryPolicy: string;
  ctaAbroad: string;
  ctaLamphun: string;
  ctaPattaya: string;
  ctaPhuket: string;
};

const COPY: Record<'en' | 'th', FlowerDeliveryThailandCopy> = {
  en: {
    metaTitle: 'Flower Delivery Coverage in Thailand & Chiang Mai Fees | Lanna Bloom',
    metaDescription:
      'See live Thailand flower-delivery coverage by province, then check Chiang Mai, Lamphun, Pattaya, and Phuket district fees. Listed Pattaya and Phuket areas from ฿250. Gradual expansion; nationwide same-day is not promised.',
    h1: 'Flower delivery across Thailand — Chiang Mai fees & coverage',
    mapHint:
      'Tap a province for live status. Tap Chiang Mai, Lamphun, Pattaya (Chon Buri), or Phuket for district fees.',
    intro:
      'Lanna Bloom is expanding flower and gift delivery across Thailand, province by province. Chiang Mai remains our reliable full-service home base — select a district on the fee map for estimated delivery costs. Lamphun is open for next-day flower delivery across all amphoes from ฿250. Pattaya covers listed Pattaya areas from ฿250 — not the rest of Chon Buri. Phuket covers listed island areas from ฿250. We expand gradually — nationwide same-day is not promised.',
    areasTitle: 'Chiang Mai — our full-service core',
    chiangMaiTitle: 'Chiang Mai',
    chiangMaiIntro:
      'Our home base. We deliver flowers and gifts across Chiang Mai — including Hang Dong, Mae Ai, Fang, and the districts and neighborhoods listed below.',
    districtsSubtitle: 'Districts (amphoe)',
    neighborhoodsSubtitle: 'Popular areas & neighborhoods',
    chiangMaiNote:
      'Don’t see your exact street? Add your address at checkout — we deliver to hotels, condos, offices, and homes throughout the areas below.',
    lamphunTitle: 'Lamphun',
    lamphunIntro:
      'Next-day flower delivery across Lamphun province. Delivery from ฿250 — same-day is not available. Shop by amphoe below or on the coverage map.',
    lamphunNote:
      'Choose Lamphun as your delivery destination at checkout, then select your amphoe. Fees start at ฿250 for every amphoe listed.',
    pattayaTitle: 'Pattaya',
    pattayaIntro:
      'Flower delivery for listed Pattaya areas — not province-wide Chon Buri. Delivery from ฿250. Shop below or tap Chon Buri on the coverage map, then choose your Pattaya area at checkout.',
    pattayaNote:
      'Choose Pattaya as your delivery destination at checkout, then select the area. Na Jomtien is listed as a Pattaya area. Other Chon Buri districts such as Si Racha are not on this map.',
    phuketTitle: 'Phuket',
    phuketIntro:
      'Flower delivery for listed Phuket areas from ฿250 — subject to cutoff and coverage. Shop below or tap Phuket on the coverage map, then choose your area at checkout.',
    phuketNote:
      'Choose Phuket as your delivery destination at checkout, then select the area. Fees start at ฿250 in Phuket Town and Kathu; remote east and airport areas are higher.',
    otherDestinationsTitle: 'Currently shoppable provinces',
    expandingNote:
      'Only provinces where ordering is open right now. Status and categories come from live settings — we do not promise nationwide same-day delivery.',
    ctaChiangMai: 'Chiang Mai flower delivery',
    ctaDeliveryPolicy: 'Delivery policy',
    ctaAbroad: 'Send flowers from abroad',
    ctaLamphun: 'Lamphun flower delivery',
    ctaPattaya: 'Pattaya flower delivery',
    ctaPhuket: 'Phuket flower delivery',
  },
  th: {
    metaTitle: 'พื้นที่จัดส่งดอกไม้ทั่วไทย และค่าส่งเชียงใหม่ | Lanna Bloom',
    metaDescription:
      'ดูสถานะจัดส่งดอกไม้รายจังหวัดทั่วไทยแบบสด แล้วตรวจสอบค่าส่งรายอำเภอในเชียงใหม่ ลำพูน พัทยา และภูเก็ต พื้นที่พัทยาและภูเก็ตที่ระบุเริ่มต้น ฿250 — ไม่รับประกันจัดส่งวันเดียวกันทั่วประเทศ',
    h1: 'จัดส่งดอกไม้ทั่วไทย — ค่าส่งและพื้นที่เชียงใหม่',
    mapHint:
      'แตะจังหวัดเพื่อดูสถานะ — แตะเชียงใหม่ ลำพูน พัทยา (ชลบุรี) หรือภูเก็ต เพื่อดูค่าส่งรายอำเภอ',
    intro:
      'Lanna Bloom กำลังขยายบริการจัดส่งดอกไม้และของขวัญทั่วไทยทีละจังหวัด เชียงใหม่ยังเป็นฐานบริการหลักที่ครบวงจร — เลือกอำเภอบนแผนที่ค่าส่งเพื่อดูค่าจัดส่งโดยประมาณ ลำพูนเปิดรับจัดส่งดอกไม้วันถัดไปทุกอำเภอเริ่มต้น ฿250 พัทยาครอบคลุมย่านพัทยาที่ระบุ เริ่มต้น ฿250 — ไม่รวมชลบุรีทั้งจังหวัด ภูเก็ตครอบคลุมย่านบนเกาะที่ระบุ เริ่มต้น ฿250 ขยายอย่างค่อยเป็นค่อยไป — ไม่รับประกันจัดส่งวันเดียวกันทั่วประเทศ',
    areasTitle: 'เชียงใหม่ — ฐานบริการหลักครบวงจร',
    chiangMaiTitle: 'เชียงใหม่',
    chiangMaiIntro:
      'ฐานให้บริการหลักของเรา จัดส่งดอกไม้และของขวัญทั่วเชียงใหม่ รวมหางดง แม่เอ๋ย ฝาง และอำเภอ/ย่านด้านล่าง',
    districtsSubtitle: 'อำเภอ',
    neighborhoodsSubtitle: 'ย่านและพื้นที่ยอดนิยม',
    chiangMaiNote:
      'ไม่เห็นถนนของคุณในรายการ? กรอกที่อยู่ตอนชำระเงินได้เลย — เราจัดส่งไปโรงแรม คอนโด ออฟฟิศ และบ้านในพื้นที่ด้านล่าง',
    lamphunTitle: 'ลำพูน',
    lamphunIntro:
      'จัดส่งดอกไม้วันถัดไปทั่วจังหวัดลำพูน ค่าส่งเริ่มต้น ฿250 — ไม่มีบริการวันเดียวกัน เลือกอำเภอด้านล่างหรือบนแผนที่พื้นที่บริการ',
    lamphunNote:
      'เลือกปลายทางลำพูนตอนชำระเงิน แล้วเลือกอำเภอ ค่าส่งเริ่มต้น ฿250 สำหรับทุกอำเภอในรายการ',
    pattayaTitle: 'พัทยา',
    pattayaIntro:
      'จัดส่งดอกไม้ในย่านพัทยาที่ระบุ — ไม่ครอบคลุมทั้งจังหวัดชลบุรี ค่าส่งเริ่มต้น ฿250 เลือกด้านล่างหรือแตะชลบุรีบนแผนที่พื้นที่บริการ แล้วเลือกย่านพัทยาตอนชำระเงิน',
    pattayaNote:
      'เลือกปลายทางพัทยาตอนชำระเงิน แล้วเลือกย่าน นาจอมเทียนอยู่ในรายการย่านพัทยา อำเภออื่นในชลบุรี เช่น ศรีราชา ไม่อยู่บนแผนที่นี้',
    phuketTitle: 'ภูเก็ต',
    phuketIntro:
      'จัดส่งดอกไม้ในย่านภูเก็ตที่ระบุ เริ่มต้น ฿250 — ขึ้นกับเวลาตัดออเดอร์และความครอบคลุม เลือกด้านล่างหรือแตะภูเก็ตบนแผนที่พื้นที่บริการ แล้วเลือกย่านตอนชำระเงิน',
    phuketNote:
      'เลือกปลายทางภูเก็ตตอนชำระเงิน แล้วเลือกย่าน ค่าส่งเริ่มต้น ฿250 ในเมืองภูเก็ตและกะทู้ พื้นที่ตะวันออกห่างไกลและสนามบินสูงกว่า',
    otherDestinationsTitle: 'จังหวัดที่สั่งได้ตอนนี้',
    expandingNote:
      'แสดงเฉพาะจังหวัดที่เปิดรับออเดอร์ สถานะและหมวดสินค้ามาจากการตั้งค่าจริง — ไม่รับประกันจัดส่งวันเดียวกันทั่วประเทศ',
    ctaChiangMai: 'ส่งดอกไม้เชียงใหม่',
    ctaDeliveryPolicy: 'นโยบายการจัดส่ง',
    ctaAbroad: 'ส่งดอกไม้จากต่างประเทศ',
    ctaLamphun: 'ส่งดอกไม้ลำพูน',
    ctaPattaya: 'ส่งดอกไม้พัทยา',
    ctaPhuket: 'ส่งดอกไม้ภูเก็ต',
  },
};

export function getFlowerDeliveryThailandCopy(lang: Locale): FlowerDeliveryThailandCopy {
  if (lang === 'th') return COPY.th;
  return COPY.en;
}
