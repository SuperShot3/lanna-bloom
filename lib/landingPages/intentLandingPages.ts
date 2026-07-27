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
    eyebrow: L('Same-day in Chiang Mai', 'จัดส่งวันเดียวในเชียงใหม่'),
    directAnswer: L(
      'Yes — order online before 18:00 for same-day flower delivery across Chiang Mai during service hours 09:00–20:00. Pay securely at checkout, then our local team prepares and delivers.',
      'ได้ — สั่งออนไลน์ก่อน 18:00 เพื่อจัดส่งดอกไม้วันเดียวทั่วเชียงใหม่ในช่วง 09:00–20:00 จ่ายปลอดภัยตอนเช็กเอาต์ แล้วทีมท้องถิ่นจะจัดช่อและส่งให้'
    ),
    benefits: [
      L('Same-day delivery during 09:00–20:00', 'จัดส่งวันเดียวช่วง 09:00–20:00'),
      L('Order early for best bouquet availability', 'สั่งเช้า ๆ เพื่อมีตัวเลือกช่อดีที่สุด'),
      L('Message card included with your bouquet', 'มีข้อความการ์ดคู่ช่อ'),
      L('Thai & English support', 'รองรับภาษาไทยและอังกฤษ'),
    ],
    primaryCta: L('Order for today', 'สั่งส่งวันนี้'),
    primaryCtaHref: '/catalog',
    catalogTitle: L('Bouquets for same-day delivery', 'ช่อสำหรับจัดส่งวันเดียว'),
    catalogLimit: 12,
    showPaymentBadges: false,
    showSameDayBadge: true,
    serviceHoursNote: L(
      'Service hours today: 09:00–20:00 · Order before 18:00 for same-day',
      'เวลาให้บริการวันนี้: 09:00–20:00 · สั่งก่อน 18:00 เพื่อจัดส่งวันเดียว'
    ),
    faqTitle: L('Frequently asked questions', 'คำถามที่พบบ่อย'),
    faq: [
      {
        q: L('How do I get same-day delivery?', 'ขอจัดส่งวันเดียวได้อย่างไร?'),
        a: L(
          'Browse the catalog, choose a bouquet, add it to your cart, and select today’s delivery date at checkout. Pay online, and we will confirm if same-day is available for your area and timing.',
          'เลือกช่อในแคตตาล็อก ใส่ตะกร้า แล้วเลือกวันจัดส่งเป็นวันนี้ตอนเช็กเอาต์ จ่ายออนไลน์ แล้วเราจะยืนยันว่าจัดส่งวันเดียวได้ตามพื้นที่และเวลาของคุณ'
        ),
      },
      {
        q: L('Is there a cut-off time for same-day delivery?', 'มีเวลาตัดรอบสำหรับจัดส่งวันเดียวไหม?'),
        a: L(
          'We deliver 09:00–20:00. Orders placed before about 18:00 are usually eligible for same-day when flowers and capacity allow. Later orders are typically scheduled for the next day.',
          'เราจัดส่ง 09:00–20:00 ออเดอร์ก่อนประมาณ 18:00 มักเข้าเกณฑ์วันเดียวเมื่อดอกไม้และความจุพอ ออเดอร์หลังนั้นมักนัดวันถัดไป'
        ),
      },
      {
        q: L('What payment methods do you accept?', 'รับชำระแบบไหนบ้าง?'),
        a: L(
          'Pay securely online by card through Stripe checkout (Visa, Mastercard, American Express, and other widely used cards). Apple Pay and Google Pay are available where supported. Message us on LINE or WhatsApp only if you need help.',
          'จ่ายออนไลน์ปลอดภัยด้วยบัตรผ่าน Stripe (Visa, Mastercard, American Express และบัตรที่ใช้ทั่วไป) รองรับ Apple Pay และ Google Pay ตามที่ระบบรองรับ ทัก LINE / WhatsApp ได้หากต้องการความช่วยเหลือ'
        ),
      },
      {
        q: L('Can I include a message card?', 'ใส่ข้อความการ์ดได้ไหม?'),
        a: L(
          'Yes. Add a free or premium message card when you order — enter your text in the cart or checkout notes.',
          'ได้ เพิ่มการ์ดข้อความฟรีหรือพรีเมียมตอนสั่ง — พิมพ์ข้อความในตะกร้าหรือโน้ตตอนเช็กเอาต์'
        ),
      },
      {
        q: L('Where do you deliver same-day?', 'จัดส่งวันเดียวถึงไหนบ้าง?'),
        a: L(
          'Across Chiang Mai — including Old City, Nimman, Santitham, Hang Dong, Mae Hia, San Sai, Mae Rim, and nearby areas within our service zones.',
          'ทั่วเชียงใหม่ — รวมเมืองเก่า นิมมาน สันติธรรม หางดง แม่เหียะ สันทราย แม่ริม และพื้นที่ใกล้เคียงในโซนให้บริการ'
        ),
      },
    ],
    relatedIntents: [
      'buy-flowers-online-chiang-mai-thailand',
      'flower-delivery-to-hotels-chiang-mai',
      'birthday-flowers-chiang-mai-from-abroad',
      'delivery-policy',
    ],
    seoMoreLabel: L('Delivery areas & how to order today', 'พื้นที่จัดส่งและวิธีสั่งวันนี้'),
    stickyCta: L('Order for today', 'สั่งส่งวันนี้'),
    seoBodyCollapsible: true,
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
