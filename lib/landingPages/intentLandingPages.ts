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
  heroImage?: { src: string; alt: LocalizedString };
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
        'Fresh flower bouquet from Lanna Bloom with laptop showing online flower ordering for Chiang Mai delivery',
        'ช่อดอกไม้สดจาก Lanna Bloom คู่แล็ปท็อปที่แสดงการสั่งดอกไม้ออนไลน์สำหรับจัดส่งในเชียงใหม่'
      ),
    },
    directAnswer: L(
      'Yes — you can buy flowers online at Lanna Bloom. Browse real bouquets, pay securely by card through Stripe checkout, and our Chiang Mai team prepares and delivers within our local service area.',
      'ได้ — สั่งดอกไม้ออนไลน์ที่ Lanna Bloom ได้เลย เลือกช่อจริง จ่ายบัตรปลอดภัยผ่าน Stripe แล้วทีมในเชียงใหม่จะจัดช่อและจัดส่งในพื้นที่ให้บริการของเรา'
    ),
    benefits: [
      L('See real bouquets in one catalog', 'ดูช่อจริงในแคตตาล็อกเดียว'),
      L('Choose size and delivery details before you pay', 'เลือกขนาดและรายละเอียดจัดส่งก่อนจ่าย'),
      L('Pay securely online with major cards', 'จ่ายออนไลน์ปลอดภัยด้วยบัตรหลัก'),
      L('Local Chiang Mai team handles delivery', 'ทีมท้องถิ่นในเชียงใหม่ดูแลการจัดส่ง'),
    ],
    primaryCta: L('Browse bouquets', 'เลือกช่อดอกไม้'),
    primaryCtaHref: '/catalog',
    catalogTitle: L('Popular bouquets to order online', 'ช่อยอดนิยมสำหรับสั่งออนไลน์'),
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
          'Can I buy flowers online in Chiang Mai and pay by card?',
          'สั่งดอกไม้ออนไลน์ในเชียงใหม่แล้วจ่ายบัตรได้ไหม?'
        ),
        a: L(
          'Yes. Lanna Bloom uses secure Stripe checkout for major credit and debit cards. Browse bouquets, enter delivery details, and pay online in one flow.',
          'ได้ Lanna Bloom ใช้ Stripe ชำระเงินปลอดภัยรองรับบัตรเครดิตและเดบิตหลัก เลือกช่อ กรอกรายละเอียดจัดส่ง และจ่ายออนไลน์ในขั้นตอนเดียว'
        ),
      },
      {
        q: L(
          'Do you deliver locally in Chiang Mai after I order online?',
          'หลังสั่งออนไลน์แล้วจัดส่งในเชียงใหม่ไหม?'
        ),
        a: L(
          'Yes. After checkout, our local team prepares your bouquet and delivers within our Chiang Mai service area. See the delivery policy for zones, fees, and timing.',
          'ได้ หลังเช็กเอาต์ทีมท้องถิ่นจะจัดช่อและส่งในพื้นที่ให้บริการเชียงใหม่ ดูนโยบายจัดส่งสำหรับโซน ค่าส่ง และเวลา'
        ),
      },
      {
        q: L(
          'Can I order flowers online if I am outside Thailand?',
          'สั่งดอกไม้ออนไลน์จากต่างประเทศได้ไหม?'
        ),
        a: L(
          'Yes. Card checkout makes it easier to order from abroad while delivery is handled locally in Chiang Mai.',
          'ได้ การจ่ายบัตรช่วยให้สั่งจากต่างประเทศง่ายขึ้น ขณะที่การจัดส่งดูแลโดยทีมในเชียงใหม่'
        ),
      },
      {
        q: L(
          'Is same-day delivery available for online orders?',
          'สั่งออนไลน์แล้วขอจัดส่งวันเดียวได้ไหม?'
        ),
        a: L(
          'Same-day delivery may be available depending on bouquet, order time, and location. Order earlier in the day for the best chance — usually before 18:00 for delivery during 09:00–20:00.',
          'อาจจัดส่งวันเดียวได้ ขึ้นกับช่อ เวลาสั่ง และพื้นที่ สั่งเช้า ๆ จะมีโอกาสดีกว่า — โดยทั่วไปก่อน 18:00 เพื่อจัดส่งช่วง 09:00–20:00'
        ),
      },
      {
        q: L(
          'What details should I include at checkout?',
          'ควรกรอกอะไรตอนเช็กเอาต์?'
        ),
        a: L(
          'Include the recipient’s name, phone number, full address or map pin, preferred delivery date, and any message-card text or surprise notes.',
          'ใส่ชื่อผู้รับ เบอร์โทร ที่อยู่เต็มหรือหมุดแผนที่ วันจัดส่งที่ต้องการ และข้อความการ์ดหรือโน้ตเซอร์ไพรส์ถ้ามี'
        ),
      },
    ],
    relatedIntents: [
      'same-day-flower-delivery-chiang-mai',
      'flowers-chiang-mai',
      'birthday-flowers-chiang-mai-from-abroad',
      'delivery-policy',
    ],
    seoMoreLabel: L('How online ordering works', 'วิธีสั่งออนไลน์'),
    stickyCta: L('Browse bouquets', 'เลือกช่อดอกไม้'),
    seoBodyCollapsible: true,
  },

  'same-day-flower-delivery-chiang-mai': {
    slug: 'same-day-flower-delivery-chiang-mai',
    pageMode: 'commercial',
    heroVariant: 'compact',
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
          'Pay securely online by card through Stripe checkout (Visa, Mastercard, American Express, and other widely used cards). You can also message us on LINE or WhatsApp if you need help.',
          'จ่ายออนไลน์ปลอดภัยด้วยบัตรผ่าน Stripe (Visa, Mastercard, American Express และบัตรที่ใช้ทั่วไป) หรือทัก LINE / WhatsApp หากต้องการความช่วยเหลือ'
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
      'flowers-chiang-mai',
      'flower-delivery-to-hotels-chiang-mai',
      'delivery-policy',
    ],
    seoMoreLabel: L('Delivery areas & how to order today', 'พื้นที่จัดส่งและวิธีสั่งวันนี้'),
    stickyCta: L('Order for today', 'สั่งส่งวันนี้'),
    seoBodyCollapsible: true,
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
