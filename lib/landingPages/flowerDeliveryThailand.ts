import type { Locale } from '@/lib/i18n';
import { CHIANG_MAI_DISTRICTS } from '@/lib/delivery-areas';
import { getActiveMarkets } from '@/lib/delivery/markets';
import { CHON_BURI_AMPHOE_MAP_DISTRICTS } from '@/lib/delivery/chonBuriAmphoeMapData';
import { LAMPHUN_AMPHOE_MAP_DISTRICTS } from '@/lib/delivery/lamphunAmphoeMapData';
import { PHUKET_AMPHOE_MAP_DISTRICTS } from '@/lib/delivery/phuketAmphoeMapData';
import { PRACHUAP_KHIRI_KHAN_AMPHOE_MAP_DISTRICTS } from '@/lib/delivery/prachuapKhiriKhanAmphoeMapData';
import { KRABI_AMPHOE_MAP_DISTRICTS } from '@/lib/delivery/krabiAmphoeMapData';
import { SURAT_THANI_AMPHOE_MAP_DISTRICTS } from '@/lib/delivery/suratThaniAmphoeMapData';
import { BANGKOK_AMPHOE_MAP_DISTRICTS } from '@/lib/delivery/bangkokAmphoeMapData';

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

/** Hua Hin checkout areas (city market — not the rest of Prachuap Khiri Khan). */
export function getHuaHinDeliveryDistricts(): LocalizedLabel[] {
  return PRACHUAP_KHIRI_KHAN_AMPHOE_MAP_DISTRICTS.map((d) => ({
    nameEn: d.labelEn,
    nameTh: d.labelTh,
  }));
}

/** Krabi / Ao Nang listed checkout areas (city market — not the rest of Krabi). */
export function getKrabiDeliveryDistricts(): LocalizedLabel[] {
  return KRABI_AMPHOE_MAP_DISTRICTS.map((d) => ({
    nameEn: d.labelEn,
    nameTh: d.labelTh,
  }));
}

/** Koh Samui checkout areas (city market — not the rest of Surat Thani). */
export function getSamuiDeliveryDistricts(): LocalizedLabel[] {
  return SURAT_THANI_AMPHOE_MAP_DISTRICTS.map((d) => ({
    nameEn: d.labelEn,
    nameTh: d.labelTh,
  }));
}

/** Bangkok listed checkout areas (khet groups covering the whole province). */
export function getBangkokDeliveryDistricts(): LocalizedLabel[] {
  return BANGKOK_AMPHOE_MAP_DISTRICTS.map((d) => ({
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
  bangkokTitle: string;
  bangkokIntro: string;
  bangkokNote: string;
  lamphunTitle: string;
  lamphunIntro: string;
  lamphunNote: string;
  pattayaTitle: string;
  pattayaIntro: string;
  pattayaNote: string;
  phuketTitle: string;
  phuketIntro: string;
  phuketNote: string;
  huaHinTitle: string;
  huaHinIntro: string;
  huaHinNote: string;
  krabiTitle: string;
  krabiIntro: string;
  krabiNote: string;
  samuiTitle: string;
  samuiIntro: string;
  samuiNote: string;
  otherDestinationsTitle: string;
  expandingNote: string;
  ctaChiangMai: string;
  ctaDeliveryPolicy: string;
  ctaAbroad: string;
  ctaBangkok: string;
  ctaLamphun: string;
  ctaPattaya: string;
  ctaPhuket: string;
  ctaHuaHin: string;
  ctaKrabi: string;
  ctaSamui: string;
};

const COPY: Record<'en' | 'th', FlowerDeliveryThailandCopy> = {
  en: {
    metaTitle: 'Flower Delivery Coverage in Thailand & Chiang Mai Fees | Lanna Bloom',
    metaDescription:
      'Live Thailand flower-delivery coverage by province. Chiang Mai is our full-service core — check district fees on the map. Nationwide same-day is not promised.',
    h1: 'Flower delivery across Thailand — Chiang Mai fees & coverage',
    mapHint:
      'Tap a province for live delivery status. Where we map districts, tap again to see estimated fees.',
    intro:
      'Chiang Mai is our core — Lanna Bloom’s full-service home base for flowers and gifts. Check a district on the map for estimated fees, then browse the Chiang Mai areas listed below. We expand gradually; nationwide same-day is not promised.',
    areasTitle: 'Chiang Mai — our full-service core',
    chiangMaiTitle: 'Chiang Mai',
    chiangMaiIntro:
      'Our home base. We deliver flowers and gifts across Chiang Mai — including Hang Dong, Mae Ai, Fang, and the districts and neighborhoods listed below.',
    districtsSubtitle: 'Districts (amphoe)',
    neighborhoodsSubtitle: 'Popular areas & neighborhoods',
    chiangMaiNote:
      'Don’t see your exact street? Add your address at checkout — we deliver to hotels, condos, offices, and homes throughout the areas below.',
    bangkokTitle: 'Bangkok',
    bangkokIntro:
      'Same-day flower delivery across Bangkok from ฿250 — subject to cutoff and zone. Shop below or tap Bangkok on the coverage map, then choose your area at checkout. Nearby provinces such as Nonthaburi and Samut Prakan are not on this map.',
    bangkokNote:
      'Choose Bangkok as your delivery destination at checkout, then select the area. Fees start at ฿250 in the Old City, Siam / Silom / Sathon, Sukhumvit, and Dusit; inner-ring and Thonburi areas are ฿300; outer north, east, and west Thonburi are ฿400.',
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
    huaHinTitle: 'Hua Hin',
    huaHinIntro:
      'Flower delivery for listed Hua Hin areas — not province-wide Prachuap Khiri Khan. Delivery from ฿250. Shop below or tap Prachuap Khiri Khan on the coverage map, then choose your Hua Hin area at checkout.',
    huaHinNote:
      'Choose Hua Hin as your delivery destination at checkout, then select the area. Pran Buri, Sam Roi Yot, and other Prachuap Khiri Khan districts are not on this map.',
    krabiTitle: 'Krabi / Ao Nang',
    krabiIntro:
      'Flower delivery for listed Ao Nang and nearby Krabi areas — not province-wide Krabi. Delivery from ฿250. Shop below or tap Krabi on the coverage map, then choose your area at checkout.',
    krabiNote:
      'Choose Krabi / Ao Nang as your delivery destination at checkout, then select the area. Fees start at ฿250 in Ao Nang Center and Noppharat Thara; Klong Muang, Tubkaek, and Khao Thong are higher. Koh Lanta, Ao Luek, and other Krabi districts are not on this map.',
    samuiTitle: 'Koh Samui',
    samuiIntro:
      'Flower delivery for listed Koh Samui areas — not province-wide Surat Thani. Delivery from ฿250. Shop below or tap Surat Thani on the coverage map, then choose your Samui area at checkout.',
    samuiNote:
      'Choose Koh Samui as your delivery destination at checkout, then select the area. Fees start at ฿250 in Chaweng and Bo Phut; Lipa Noi, Taling Ngam, Na Thon, and Hua Thanon are higher. Koh Phangan, mainland Surat Thani, and other islands are not on this map.',
    otherDestinationsTitle: 'Currently shoppable provinces',
    expandingNote:
      'Only provinces where ordering is open right now. Status and categories come from live settings — we do not promise nationwide same-day delivery.',
    ctaChiangMai: 'Chiang Mai flower delivery',
    ctaDeliveryPolicy: 'Delivery policy',
    ctaAbroad: 'Send flowers from abroad',
    ctaBangkok: 'Bangkok flower delivery',
    ctaLamphun: 'Lamphun flower delivery',
    ctaPattaya: 'Pattaya flower delivery',
    ctaPhuket: 'Phuket flower delivery',
    ctaHuaHin: 'Hua Hin flower delivery',
    ctaKrabi: 'Krabi / Ao Nang flower delivery',
    ctaSamui: 'Koh Samui flower delivery',
  },
  th: {
    metaTitle: 'พื้นที่จัดส่งดอกไม้ทั่วไทย และค่าส่งเชียงใหม่ | Lanna Bloom',
    metaDescription:
      'ดูสถานะจัดส่งดอกไม้รายจังหวัดทั่วไทย เชียงใหม่คือฐานบริการหลักครบวงจร — ตรวจค่าส่งรายอำเภอบนแผนที่ ไม่รับประกันจัดส่งวันเดียวกันทั่วประเทศ',
    h1: 'จัดส่งดอกไม้ทั่วไทย — ค่าส่งและพื้นที่เชียงใหม่',
    mapHint:
      'แตะจังหวัดเพื่อดูสถานะจัดส่ง — จังหวัดที่มีแผนที่รายอำเภอ แตะอีกครั้งเพื่อดูค่าส่งโดยประมาณ',
    intro:
      'เชียงใหม่คือฐานหลักของเรา — ตลาดที่ Lanna Bloom ให้บริการดอกไม้และของขวัญแบบครบวงจร เลือกอำเภอบนแผนที่เพื่อดูค่าส่งโดยประมาณ แล้วดูพื้นที่เชียงใหม่ด้านล่าง เราขยายอย่างค่อยเป็นค่อยไป ไม่รับประกันจัดส่งวันเดียวกันทั่วประเทศ',
    areasTitle: 'เชียงใหม่ — ฐานบริการหลักครบวงจร',
    chiangMaiTitle: 'เชียงใหม่',
    chiangMaiIntro:
      'ฐานให้บริการหลักของเรา จัดส่งดอกไม้และของขวัญทั่วเชียงใหม่ รวมหางดง แม่เอ๋ย ฝาง และอำเภอ/ย่านด้านล่าง',
    districtsSubtitle: 'อำเภอ',
    neighborhoodsSubtitle: 'ย่านและพื้นที่ยอดนิยม',
    chiangMaiNote:
      'ไม่เห็นถนนของคุณในรายการ? กรอกที่อยู่ตอนชำระเงินได้เลย — เราจัดส่งไปโรงแรม คอนโด ออฟฟิศ และบ้านในพื้นที่ด้านล่าง',
    bangkokTitle: 'กรุงเทพฯ',
    bangkokIntro:
      'จัดส่งดอกไม้วันเดียวกันทั่วกรุงเทพฯ เริ่มต้น ฿250 — ขึ้นกับเวลาตัดออเดอร์และโซน เลือกด้านล่างหรือแตะกรุงเทพบนแผนที่พื้นที่บริการ แล้วเลือกย่านตอนชำระเงิน จังหวัดใกล้เคียง เช่น นนทบุรีและสมุทรปราการไม่อยู่บนแผนที่นี้',
    bangkokNote:
      'เลือกปลายทางกรุงเทพฯ ตอนชำระเงิน แล้วเลือกย่าน ค่าส่งเริ่มต้น ฿250 ในเมืองเก่า สยาม/สีลม/สาทร สุขุมวิท และดุสิต วงแหวนชั้นในและธนบุรีชั้นใน ฿300 กรุงเทพฯเหนือ ตะวันออกชั้นนอก และธนบุรีตะวันตก ฿400',
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
    huaHinTitle: 'หัวหิน',
    huaHinIntro:
      'จัดส่งดอกไม้ในย่านหัวหินที่ระบุ — ไม่ครอบคลุมทั้งจังหวัดประจวบคีรีขันธ์ ค่าส่งเริ่มต้น ฿250 เลือกด้านล่างหรือแตะประจวบคีรีขันธ์บนแผนที่พื้นที่บริการ แล้วเลือกย่านหัวหินตอนชำระเงิน',
    huaHinNote:
      'เลือกปลายทางหัวหินตอนชำระเงิน แล้วเลือกย่าน ปราณบุรี สามร้อยยอด และอำเภออื่นในประจวบคีรีขันธ์ไม่อยู่บนแผนที่นี้',
    krabiTitle: 'กระบี่ / อ่าวนาง',
    krabiIntro:
      'จัดส่งดอกไม้ในย่านอ่าวนางและกระบี่ใกล้เคียงที่ระบุ — ไม่ครอบคลุมทั้งจังหวัดกระบี่ ค่าส่งเริ่มต้น ฿250 เลือกด้านล่างหรือแตะกระบี่บนแผนที่พื้นที่บริการ แล้วเลือกย่านตอนชำระเงิน',
    krabiNote:
      'เลือกปลายทางกระบี่ / อ่าวนางตอนชำระเงิน แล้วเลือกย่าน ค่าส่งเริ่มต้น ฿250 ในอ่าวนางกลางและนพรัตน์ธารา คลองม่วง ถ้ำแขก และเขาทองสูงกว่า เกาะลันตา อ่าวลึก และอำเภออื่นในกระบี่ไม่อยู่บนแผนที่นี้',
    samuiTitle: 'เกาะสมุย',
    samuiIntro:
      'จัดส่งดอกไม้ในย่านเกาะสมุยที่ระบุ — ไม่ครอบคลุมทั้งจังหวัดสุราษฎร์ธานี ค่าส่งเริ่มต้น ฿250 เลือกด้านล่างหรือแตะสุราษฎร์ธานีบนแผนที่พื้นที่บริการ แล้วเลือกย่านสมุยตอนชำระเงิน',
    samuiNote:
      'เลือกปลายทางเกาะสมุยตอนชำระเงิน แล้วเลือกย่าน ค่าส่งเริ่มต้น ฿250 ในเฉวงและบ่อผุด ลิปะน้อย ตลิ่งงาม หน้าทอน และหัวถนนสูงกว่า เกาะพะงัน แผ่นดินสุราษฎร์ธานี และเกาะอื่นไม่อยู่บนแผนที่นี้',
    otherDestinationsTitle: 'จังหวัดที่สั่งได้ตอนนี้',
    expandingNote:
      'แสดงเฉพาะจังหวัดที่เปิดรับออเดอร์ สถานะและหมวดสินค้ามาจากการตั้งค่าจริง — ไม่รับประกันจัดส่งวันเดียวกันทั่วประเทศ',
    ctaChiangMai: 'ส่งดอกไม้เชียงใหม่',
    ctaDeliveryPolicy: 'นโยบายการจัดส่ง',
    ctaAbroad: 'ส่งดอกไม้จากต่างประเทศ',
    ctaBangkok: 'ส่งดอกไม้กรุงเทพฯ',
    ctaLamphun: 'ส่งดอกไม้ลำพูน',
    ctaPattaya: 'ส่งดอกไม้พัทยา',
    ctaPhuket: 'ส่งดอกไม้ภูเก็ต',
    ctaHuaHin: 'ส่งดอกไม้หัวหิน',
    ctaKrabi: 'ส่งดอกไม้กระบี่ / อ่าวนาง',
    ctaSamui: 'ส่งดอกไม้เกาะสมุย',
  },
};

export function getFlowerDeliveryThailandCopy(lang: Locale): FlowerDeliveryThailandCopy {
  if (lang === 'th') return COPY.th;
  return COPY.en;
}
