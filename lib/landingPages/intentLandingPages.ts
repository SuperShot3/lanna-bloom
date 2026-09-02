import type { Locale } from '@/lib/i18n';
import type { CatalogFilterParams } from '@/lib/catalogListLogic';

export type PageMode = 'blog' | 'commercial' | 'hybrid';

export type LocalizedString = { en: string; th: string };

export type IntentFaqItem = {
  q: LocalizedString;
  a: LocalizedString;
};

export type IntentHeroVariant = 'split' | 'compact';

export type IntentLandingConfig = {
  slug: string;
  pageMode: Exclude<PageMode, 'blog'>;
  heroVariant: IntentHeroVariant;
  /** Optional hero image (split layout). Path under /public */
  heroImage?: {
    src: string;
    alt: LocalizedString;
    /** CSS object-position, e.g. "75% center" to bias toward bouquet */
    objectPosition?: string;
  };
  /** Accent badge above H1 (e.g. same-day) */
  eyebrow?: LocalizedString;
  directAnswer: LocalizedString;
  benefits: LocalizedString[];
  primaryCta: LocalizedString;
  primaryCtaHref?: string;
  catalogTitle: LocalizedString;
  catalogLimit?: number;
  /** Prefer these bouquet slugs first; fill remainder from popular */
  featuredSlugs?: string[];
  catalogFilter?: CatalogFilterParams;
  showPaymentBadges?: boolean;
  showSameDayBadge?: boolean;
  serviceHoursNote?: LocalizedString;
  faqTitle: LocalizedString;
  faq: IntentFaqItem[];
  relatedIntents: string[];
  seoMoreLabel: LocalizedString;
  stickyCta: LocalizedString;
  /** Collapse MDX by default */
  seoBodyCollapsible?: boolean;
  /** Show interactive Chiang Mai delivery district map */
  showDeliveryMap?: boolean;
};

function L(en: string, th: string): LocalizedString {
  return { en, th };
}

export const INTENT_LANDINGS: Record<string, IntentLandingConfig> = {
  'buy-flowers-online-chiang-mai-thailand': {
    slug: 'buy-flowers-online-chiang-mai-thailand',
    pageMode: 'commercial',
    heroVariant: 'split',
    heroImage: {
      src: '/blog_images/buy-flowers-online/buy-flower-online-lannabloom.png',
      alt: L(
        'Fresh flower bouquet from Lanna Bloom with laptop for ordering flower delivery in Thailand from abroad',
        'ช่อดอกไม้สดจาก Lanna Bloom คู่แล็ปท็อปสำหรับสั่งดอกไม้จัดส่งในประเทศไทยจากต่างประเทศ'
      ),
    },
    directAnswer: L(
      'Yes — you can send flowers to Thailand from another country. Browse real bouquets, pay securely with an international card through Stripe, and a local team prepares and delivers. Availability depends on the destination city.',
      'ได้ — ส่งดอกไม้ไปประเทศไทยจากต่างประเทศได้ เลือกช่อจริง จ่ายบัตรต่างประเทศปลอดภัยผ่าน Stripe แล้วทีมท้องถิ่นจัดช่อและจัดส่ง ความพร้อมขึ้นกับเมืองปลายทาง'
    ),
    benefits: [
      L('Pay with international cards (Apple Pay / Google Pay where supported)', 'จ่ายบัตรต่างประเทศ (รองรับ Apple Pay / Google Pay ตามอุปกรณ์)'),
      L('No Thai bank account required', 'ไม่ต้องมีบัญชีธนาคารไทย'),
      L('Hotels, villas, condos, hospitals, offices, and homes', 'โรงแรม วิลล่า คอนโด โรงพยาบาล ออฟฟิศ และบ้าน'),
      L('Expanding across Thailand — Chiang Mai fullest catalogue', 'ขยายทั่วไทย — เชียงใหม่มีแคตตาล็อกครบที่สุด'),
    ],
    primaryCta: L('Browse bouquets', 'เลือกช่อดอกไม้'),
    primaryCtaHref: '/catalog',
    catalogTitle: L('Popular bouquets to send from abroad', 'ช่อยอดนิยมสำหรับส่งจากต่างประเทศ'),
    catalogLimit: 12,
    featuredSlugs: [
      'red-rose-romance',
      'sunflower-bouquet',
      'gentle-pink-rose-bouquet',
      'sunny-happiness-mix',
    ],
    showPaymentBadges: true,
    showSameDayBadge: true,
    faqTitle: L('Frequently asked questions', 'คำถามที่พบบ่อย'),
    faq: [
      {
        q: L(
          'Can I order flowers for someone in Thailand from another country?',
          'สั่งดอกไม้ให้คนในประเทศไทยจากต่างประเทศได้ไหม?'
        ),
        a: L(
          'Yes. Complete checkout online with an international card through Stripe. A local team prepares and delivers in the destination city — you do not need a Thai bank account. Coverage depends on the city; Chiang Mai has the fullest catalogue.',
          'ได้ ชำระออนไลน์ด้วยบัตรต่างประเทศผ่าน Stripe ทีมท้องถิ่นจัดช่อและจัดส่งในเมืองปลายทาง — ไม่ต้องมีบัญชีธนาคารไทย ความครอบคลุมขึ้นกับเมือง เชียงใหม่มีแคตตาล็อกครบที่สุด'
        ),
      },
      {
        q: L(
          'Which payment methods work for overseas customers?',
          'ลูกค้าต่างประเทศจ่ายแบบไหนได้บ้าง?'
        ),
        a: L(
          'Major credit and debit cards via Stripe. Apple Pay and Google Pay appear where your device and bank support them.',
          'บัตรเครดิตและเดบิตหลักผ่าน Stripe หากอุปกรณ์และธนาคารรองรับ จะมี Apple Pay และ Google Pay'
        ),
      },
      {
        q: L(
          'What recipient details should I include?',
          'ควรกรอกข้อมูลผู้รับอะไรบ้าง?'
        ),
        a: L(
          'Recipient full name, a working Thai phone number, hotel/villa/condo/hospital/office/home details, a Google Maps pin when helpful, preferred delivery date, and any surprise notes.',
          'ชื่อเต็มผู้รับ เบอร์ไทยที่ติดต่อได้ รายละเอียดโรงแรม/วิลล่า/คอนโด/โรงพยาบาล/ออฟฟิศ/บ้าน หมุดแผนที่ถ้าช่วยได้ วันจัดส่ง และโน้ตเซอร์ไพรส์ถ้ามี'
        ),
      },
      {
        q: L(
          'Does same-day delivery follow my home timezone?',
          'จัดส่งวันเดียวอิงเขตเวลาบ้านฉันไหม?'
        ),
        a: L(
          'No. Same-day eligibility follows Thailand local time (ICT) and our cutoff. Chiang Mai same-day is strongest; other cities depend on availability. From most overseas time zones, order one day ahead when possible.',
          'ไม่ อิงเวลาประเทศไทย (ICT) และเวลาตัดรอบของเรา วันเดียวในเชียงใหม่แข็งแรงที่สุด เมืองอื่นขึ้นกับความพร้อม จากเขตเวลาส่วนใหญ่ต่างประเทศ ควรสั่งล่วงหน้าหนึ่งวันเมื่อเป็นไปได้'
        ),
      },
      {
        q: L(
          'Can I send flowers to a hotel in Thailand?',
          'ส่งดอกไม้ไปโรงแรมในไทยได้ไหม?'
        ),
        a: L(
          'Yes. Include the hotel name, guest name, room if known, and a reachable phone or reception contact so delivery can complete — including surprise deliveries.',
          'ได้ ใส่ชื่อโรงแรม ชื่อผู้เข้าพัก ห้องถ้ารู้ และเบอร์หรือแผนกต้อนรับที่ติดต่อได้ เพื่อให้จัดส่งสำเร็จ รวมถึงแบบเซอร์ไพรส์'
        ),
      },
      {
        q: L(
          'Can I keep the delivery a surprise or anonymous?',
          'จัดส่งแบบเซอร์ไพรส์หรือไม่ระบุผู้ส่งได้ไหม?'
        ),
        a: L(
          'Yes. Add surprise instructions in the order notes and omit your name from the card if you wish. We still need a reachable contact such as hotel reception or a trusted local number.',
          'ได้ ใส่โน้ตเซอร์ไพรส์ในออเดอร์และไม่ใส่ชื่อบนการ์ดได้หากต้องการ เรายังต้องมีเบอร์ที่ติดต่อได้ เช่น แผนกต้อนรับโรงแรมหรือคนในพื้นที่'
        ),
      },
      {
        q: L(
          'What if the recipient does not answer?',
          'ถ้าผู้รับไม่รับสายจะทำอย่างไร?'
        ),
        a: L(
          'We follow the wait and redelivery rules in our delivery policy. A backup contact — reception, condo office, or your WhatsApp/LINE — greatly improves success.',
          'เราทำตามกฎการรอและการส่งใหม่ในนโยบายจัดส่ง เบอร์สำรอง — แผนกต้อนรับ สำนักงานนิติบุคคล หรือ WhatsApp/LINE ของคุณ — ช่วยให้สำเร็จมากขึ้น'
        ),
      },
    ],
    relatedIntents: [
      'same-day-flower-delivery-chiang-mai',
      'flower-delivery-to-hotels-chiang-mai',
      'flower-delivery-address-chiang-mai',
      'birthday-flowers-chiang-mai-from-abroad',
      'delivery-policy',
    ],
    seoMoreLabel: L('How to send flowers to Thailand from abroad', 'วิธีส่งดอกไม้ไปประเทศไทยจากต่างประเทศ'),
    stickyCta: L('Browse bouquets', 'เลือกช่อดอกไม้'),
    seoBodyCollapsible: true,
  },

  'same-day-flower-delivery-chiang-mai': {
    slug: 'same-day-flower-delivery-chiang-mai',
    pageMode: 'commercial',
    heroVariant: 'split',
    heroImage: {
      src: '/blog_images/same-day-delivery/same-day-flower-delivery-chiang-mai.png',
      alt: L(
        'Same-day flower delivery in Chiang Mai — fresh pink and white bouquet ready for local delivery',
        'จัดส่งดอกไม้วันเดียวในเชียงใหม่ — ช่อโทนชมพูขาวพร้อมส่งในพื้นที่'
      ),
      // Bias toward bouquet; baked English headline sits on the left of the artwork
      objectPosition: '78% center',
    },
    eyebrow: L('Same-day flower delivery Chiang Mai', 'ส่งดอกไม้วันเดียวในเชียงใหม่'),
    directAnswer: L(
      'Yes — same-day flower delivery in Chiang Mai is accepted until 20:00 Thailand time, subject to bouquet availability and delivery capacity. Delivery may finish after 20:00. Same-day is not promised nationwide; other Thai cities have their own delivery pages.',
      'ได้ — ส่งดอกไม้วันเดียวในเชียงใหม่รับออเดอร์ถึง 20:00 น. ตามเวลาไทย โดยขึ้นอยู่กับความพร้อมของช่อและคิวจัดส่ง อาจจัดส่งหลัง 20:00 น. ได้ ไม่สัญญาจัดส่งวันเดียวทั่วประเทศ เมืองอื่นในไทยมีหน้าจัดส่งของตัวเอง'
    ),
    benefits: [
      L('Same-day flower delivery in Chiang Mai, 08:00–20:00', 'ส่งดอกไม้วันเดียวในเชียงใหม่ ช่วง 08:00–20:00'),
      L('Order early for the best Chiang Mai bouquet choice', 'สั่งเช้า ๆ เพื่อเลือกช่อเชียงใหม่ได้ดีที่สุด'),
      L('Check Chiang Mai districts on the map below', 'ดูอำเภอเชียงใหม่บนแผนที่ด้านล่าง'),
      L('Thai & English support', 'รองรับภาษาไทยและอังกฤษ'),
    ],
    primaryCta: L('Order Chiang Mai flowers for today', 'สั่งดอกไม้เชียงใหม่ส่งวันนี้'),
    primaryCtaHref: '/catalog',
    catalogTitle: L('Bouquets for same-day flower delivery in Chiang Mai', 'ช่อสำหรับส่งดอกไม้วันเดียวในเชียงใหม่'),
    catalogLimit: 12,
    showPaymentBadges: false,
    showSameDayBadge: true,
    serviceHoursNote: L(
      'Chiang Mai service hours: 08:00–20:00 · Same-day flower orders until 20:00 Thailand time (delivery may finish after 20:00)',
      'เวลาให้บริการเชียงใหม่: 08:00–20:00 · รับออเดอร์ส่งดอกไม้วันเดียวถึง 20:00 น. ตามเวลาไทย (อาจจัดส่งหลัง 20:00 น.)'
    ),
    faqTitle: L('Frequently asked questions', 'คำถามที่พบบ่อย'),
    faq: [
      {
        q: L(
          'How do I order same-day flower delivery in Chiang Mai?',
          'สั่งส่งดอกไม้วันเดียวในเชียงใหม่อย่างไร?'
        ),
        a: L(
          'Open the catalog, choose a bouquet, add it to your cart, and select today as the delivery date at checkout. Pay online. We confirm same-day flower delivery in Chiang Mai for your district and timing.',
          'เปิดแคตตาล็อก เลือกช่อ ใส่ตะกร้า แล้วเลือกวันจัดส่งเป็นวันนี้ตอนเช็กเอาต์ จ่ายออนไลน์ เราจะยืนยันการส่งดอกไม้วันเดียวในเชียงใหม่ตามอำเภอและเวลาของคุณ'
        ),
      },
      {
        q: L(
          'What is the cutoff for same-day flower delivery in Chiang Mai?',
          'ตัดรอบส่งดอกไม้วันเดียวในเชียงใหม่กี่โมง?'
        ),
        a: L(
          'Same-day flower delivery in Chiang Mai is accepted until 20:00 Thailand time, subject to flower and courier availability. Delivery may finish after 20:00. Working hours are 08:00–20:00. If same-day is not possible, we will contact you with the next option.',
          'รับส่งดอกไม้วันเดียวในเชียงใหม่ถึง 20:00 น. ตามเวลาไทย โดยขึ้นอยู่กับความพร้อมของดอกไม้และคิวจัดส่ง อาจจัดส่งหลัง 20:00 น. ได้ เวลาทำการคือ 08:00–20:00 หากส่งภายในวันไม่ได้ เราจะติดต่อเพื่อยืนยันทางเลือกถัดไป'
        ),
      },
      {
        q: L(
          'Which Chiang Mai districts get same-day flower delivery?',
          'อำเภอไหนในเชียงใหม่ได้ส่งดอกไม้วันเดียว?'
        ),
        a: L(
          'Same-day flower delivery in Chiang Mai covers Old City, Nimman, Santitham, Hang Dong, Mae Hia, San Sai, Mae Rim, and nearby service zones. Use the map on this page for estimated fees; checkout confirms your exact area.',
          'ส่งดอกไม้วันเดียวในเชียงใหม่ครอบคลุมเมืองเก่า นิมมาน สันติธรรม หางดง แม่เหียะ สันทราย แม่ริม และโซนใกล้เคียง ใช้แผนที่ในหน้านี้ดูค่าส่งโดยประมาณ ค่าส่งจริงยืนยันตอนเช็กเอาต์'
        ),
      },
      {
        q: L(
          'Can you deliver same-day flowers to a hotel or hospital in Chiang Mai?',
          'ส่งดอกไม้วันเดียวไปโรงแรมหรือโรงพยาบาลในเชียงใหม่ได้ไหม?'
        ),
        a: L(
          'Yes, when you order in time. Include the guest or patient name, venue name, and a reachable phone number. The hotel and hospital guides linked below explain what Chiang Mai reception desks usually need.',
          'ได้ เมื่อสั่งทันเวลา ใส่ชื่อผู้เข้าพักหรือผู้ป่วย ชื่อสถานที่ และเบอร์ที่ติดต่อได้ คู่มือโรงแรมและโรงพยาบาลด้านล่างอธิบายข้อมูลที่เคาน์เตอร์เชียงใหม่มักต้องการ'
        ),
      },
      {
        q: L(
          'I am ordering from another time zone — can I still get same-day flower delivery in Chiang Mai?',
          'สั่งจากเขตเวลาอื่น ยังส่งดอกไม้วันเดียวในเชียงใหม่ได้ไหม?'
        ),
        a: L(
          'Same-day flower delivery in Chiang Mai follows Thailand time (ICT, UTC+7), not your home timezone. If you are several hours behind, order the day before. The abroad ordering guide below covers checkout from another country.',
          'ส่งดอกไม้วันเดียวในเชียงใหม่อิงเวลาประเทศไทย (ICT, UTC+7) ไม่ใช่เขตเวลาบ้านคุณ ถ้าช้ากว่าไทยหลายชั่วโมง ให้สั่งล่วงหน้าหนึ่งวัน คู่มือสั่งจากต่างประเทศด้านล่างอธิบายการเช็กเอาต์'
        ),
      },
      {
        q: L(
          'What happens if I miss the 20:00 cutoff for Chiang Mai same-day flowers?',
          'ถ้าพลาดตัดรอบ 20:00 น. สำหรับดอกไม้วันเดียวในเชียงใหม่จะเป็นอย่างไร?'
        ),
        a: L(
          'After 20:00 Thailand time, same-day flower delivery in Chiang Mai is closed. We will contact you to confirm the next available option, which may be the following day during 08:00–20:00 working hours.',
          'หลัง 20:00 น. ตามเวลาไทย การส่งดอกไม้วันเดียวในเชียงใหม่ปิดแล้ว เราจะติดต่อเพื่อยืนยันทางเลือกถัดไป ซึ่งอาจเป็นวันถัดไปในช่วง 08:00–20:00'
        ),
      },
    ],
    relatedIntents: [
      'buy-flowers-online-chiang-mai-thailand',
      'flower-delivery-to-hotels-chiang-mai',
      'flower-delivery-to-hospitals-chiang-mai',
      'flower-delivery-address-chiang-mai',
      'delivery-policy',
    ],
    seoMoreLabel: L(
      'How same-day flower delivery works in Chiang Mai',
      'วิธีส่งดอกไม้วันเดียวในเชียงใหม่'
    ),
    stickyCta: L('Order Chiang Mai flowers for today', 'สั่งดอกไม้เชียงใหม่ส่งวันนี้'),
    seoBodyCollapsible: false,
    showDeliveryMap: true,
  },
};

export function getIntentLanding(slug: string): IntentLandingConfig | undefined {
  return INTENT_LANDINGS[slug];
}

export function isCommercialIntentSlug(slug: string): boolean {
  return Boolean(INTENT_LANDINGS[slug]);
}

export function localize(value: LocalizedString, lang: Locale | string): string {
  return lang === 'th' ? value.th : value.en;
}

export function localizeFaq(
  faq: IntentFaqItem[],
  lang: Locale | string
): Array<{ q: string; a: string }> {
  return faq.map((item) => ({
    q: localize(item.q, lang),
    a: localize(item.a, lang),
  }));
}
