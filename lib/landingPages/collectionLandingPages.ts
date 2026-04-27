import type { CatalogFilterParams } from '@/lib/sanity';
import type { Locale } from '@/lib/i18n';

export type CollectionLandingSlug =
  | 'white-roses-chiang-mai'
  | 'pink-roses-chiang-mai'
  | 'red-roses-chiang-mai';

export type CollectionLandingCopy = {
  seoTitle: string;
  seoDescription: string;
  h1: string;
  eyebrow: string;
  intro: string;
  primaryCta: string;
  deliveryNote: string;
  collectionTitle: string;
  collectionIntro: string;
  addOnsTitle: string;
  addOnsIntro: string;
  trustItems: Array<{ title: string; text: string }>;
  deliveryTitle: string;
  deliveryText: string;
  faqTitle: string;
  faq: Array<{ q: string; a: string }>;
  emptyTitle: string;
  emptyText: string;
};

export type CollectionLandingPageConfig = {
  slug: CollectionLandingSlug;
  targetKeyword: string;
  colorFilter: 'white' | 'pink' | 'red';
  accentLabel: string;
  tabImageSrc: `/images_other/roses_colors_landingpage/${string}`;
  canonicalPath: `/collections/${CollectionLandingSlug}`;
  noindex?: boolean;
  filters: CatalogFilterParams;
  copy: Record<Locale, CollectionLandingCopy>;
};

const trustItems = {
  en: [
    { title: 'Same-day delivery', text: 'Across Chiang Mai during working hours.' },
    { title: 'Card payment', text: 'Secure checkout with clear order details.' },
    { title: 'Message card included', text: 'Add your personal note at checkout.' },
    { title: 'Easy checkout', text: 'Fast ordering with live cart tracking.' },
  ],
  th: [
    { title: 'จัดส่งวันเดียว', text: 'ทั่วเชียงใหม่ในเวลาทำการ' },
    { title: 'ชำระเงินด้วยบัตร', text: 'เช็คเอาต์ปลอดภัย รายละเอียดชัดเจน' },
    { title: 'มีการ์ดข้อความ', text: 'เพิ่มข้อความส่วนตัวได้ตอนสั่งซื้อ' },
    { title: 'สั่งซื้อง่าย', text: 'รวดเร็ว พร้อมตะกร้าสินค้าที่ใช้งานได้จริง' },
  ],
} satisfies Record<Locale, CollectionLandingCopy['trustItems']>;

const commonFaq = {
  en: [
    {
      q: 'Do you offer same-day rose delivery in Chiang Mai?',
      a: 'Yes. Same-day delivery is available in Chiang Mai during working hours when the selected bouquet is available.',
    },
    {
      q: 'Can I add a teddy bear, balloons, or a gift set?',
      a: 'Yes. Available add-ons come from our Sanity product catalog and can be added to your cart with the bouquet.',
    },
    {
      q: 'Can I include a message card?',
      a: 'Yes. You can add a personal message during checkout, and we include it with the delivery.',
    },
  ],
  th: [
    {
      q: 'มีบริการส่งกุหลาบวันเดียวในเชียงใหม่ไหม?',
      a: 'มีบริการจัดส่งวันเดียวในเชียงใหม่ในเวลาทำการ เมื่อช่อดอกไม้ที่เลือกพร้อมจำหน่าย',
    },
    {
      q: 'เพิ่มตุ๊กตา ลูกโป่ง หรือชุดของขวัญได้ไหม?',
      a: 'ได้ สินค้าเสริมที่มีอยู่จะดึงจาก Sanity product catalog และสามารถเพิ่มลงตะกร้าพร้อมช่อดอกไม้ได้',
    },
    {
      q: 'ใส่การ์ดข้อความได้ไหม?',
      a: 'ได้ คุณสามารถเพิ่มข้อความส่วนตัวตอนเช็คเอาต์ และเราจะจัดส่งไปพร้อมช่อดอกไม้',
    },
  ],
} satisfies Record<Locale, CollectionLandingCopy['faq']>;

export const collectionLandingPages = [
  {
    slug: 'white-roses-chiang-mai',
    targetKeyword: 'white roses chiang mai',
    colorFilter: 'white',
    accentLabel: 'White Roses',
    tabImageSrc: '/images_other/roses_colors_landingpage/white_roses.webp',
    canonicalPath: '/collections/white-roses-chiang-mai',
    filters: { topCategory: 'flowers', types: ['rose'], colors: ['white'] },
    copy: {
      en: {
        seoTitle: 'White Roses in Chiang Mai | Lanna Bloom',
        seoDescription:
          'Order white rose bouquets in Chiang Mai with same-day delivery. Elegant white roses, curated add-ons, secure checkout, and message cards.',
        h1: 'White Roses in Chiang Mai',
        eyebrow: 'Fresh roses. Handcrafted with love.',
        intro:
          'Elegant white rose bouquets for anniversaries, congratulations, sympathy, and thoughtful gifts across Chiang Mai.',
        primaryCta: 'Shop White Roses',
        deliveryNote: 'Order before 2:00 PM for same-day delivery when available.',
        collectionTitle: 'White Roses Collection',
        collectionIntro:
          'A focused selection of white rose bouquets from our Sanity catalog, filtered for rose type and white color.',
        addOnsTitle: 'Also perfect with your bouquet',
        addOnsIntro: 'Complete the gift with available teddy bears, balloons, or gift sets from our product catalog.',
        trustItems: trustItems.en,
        deliveryTitle: 'Delivery in Chiang Mai',
        deliveryText:
          'We deliver to Chiang Mai city and nearby districts. Delivery timing depends on bouquet availability, route, and checkout details.',
        faqTitle: 'Frequently Asked Questions',
        faq: commonFaq.en,
        emptyTitle: 'White roses are being updated',
        emptyText:
          'We could not find approved white rose bouquets in Sanity right now. Please browse all roses while the collection is updated.',
      },
      th: {
        seoTitle: 'กุหลาบขาวในเชียงใหม่ | Lanna Bloom',
        seoDescription:
          'สั่งช่อกุหลาบขาวในเชียงใหม่ พร้อมบริการจัดส่งวันเดียว ช่อดอกไม้โทนสุภาพ สินค้าเสริม และการ์ดข้อความ',
        h1: 'กุหลาบขาวในเชียงใหม่',
        eyebrow: 'กุหลาบสด จัดช่อด้วยความใส่ใจ',
        intro:
          'ช่อกุหลาบขาวโทนเรียบหรู เหมาะสำหรับวันครบรอบ แสดงความยินดี ส่งกำลังใจ และของขวัญในเชียงใหม่',
        primaryCta: 'เลือกกุหลาบขาว',
        deliveryNote: 'สั่งก่อน 14:00 น. เพื่อจัดส่งวันเดียวเมื่อสินค้าพร้อมจำหน่าย',
        collectionTitle: 'คอลเลกชันกุหลาบขาว',
        collectionIntro:
          'รายการช่อกุหลาบขาวจาก Sanity catalog โดยกรองจากชนิดดอกกุหลาบและสีขาว',
        addOnsTitle: 'ของเสริมที่เข้ากับช่อดอกไม้',
        addOnsIntro: 'เติมเต็มของขวัญด้วยตุ๊กตา ลูกโป่ง หรือชุดของขวัญจาก product catalog',
        trustItems: trustItems.th,
        deliveryTitle: 'จัดส่งในเชียงใหม่',
        deliveryText:
          'เราจัดส่งในตัวเมืองเชียงใหม่และอำเภอใกล้เคียง เวลาจัดส่งขึ้นอยู่กับสินค้า เส้นทาง และรายละเอียดตอนเช็คเอาต์',
        faqTitle: 'คำถามที่พบบ่อย',
        faq: commonFaq.th,
        emptyTitle: 'กำลังอัปเดตกุหลาบขาว',
        emptyText:
          'ตอนนี้ยังไม่พบช่อกุหลาบขาวที่อนุมัติแล้วใน Sanity โปรดดูช่อกุหลาบทั้งหมดระหว่างรออัปเดตคอลเลกชัน',
      },
    },
  },
  {
    slug: 'pink-roses-chiang-mai',
    targetKeyword: 'pink roses chiang mai',
    colorFilter: 'pink',
    accentLabel: 'Pink Roses',
    tabImageSrc: '/images_other/roses_colors_landingpage/pink_roses.webp',
    canonicalPath: '/collections/pink-roses-chiang-mai',
    filters: { topCategory: 'flowers', types: ['rose'], colors: ['pink'] },
    copy: {
      en: {
        seoTitle: 'Pink Roses in Chiang Mai | Lanna Bloom',
        seoDescription:
          'Shop pink rose bouquets in Chiang Mai with same-day delivery. Sweet pink roses for birthdays, romance, thank-you gifts, and celebrations.',
        h1: 'Pink Roses in Chiang Mai',
        eyebrow: 'Soft color. Fresh local florals.',
        intro:
          'Sweet pink rose bouquets for birthdays, romance, thank-you gifts, and gentle celebrations delivered in Chiang Mai.',
        primaryCta: 'Shop Pink Roses',
        deliveryNote: 'Order before 2:00 PM for same-day delivery when available.',
        collectionTitle: 'Pink Roses Collection',
        collectionIntro:
          'A focused selection of pink rose bouquets from our Sanity catalog, filtered for rose type and pink color.',
        addOnsTitle: 'Also perfect with your bouquet',
        addOnsIntro: 'Complete the gift with available teddy bears, balloons, or gift sets from our product catalog.',
        trustItems: trustItems.en,
        deliveryTitle: 'Delivery in Chiang Mai',
        deliveryText:
          'We deliver to Chiang Mai city and nearby districts. Delivery timing depends on bouquet availability, route, and checkout details.',
        faqTitle: 'Frequently Asked Questions',
        faq: commonFaq.en,
        emptyTitle: 'Pink roses are being updated',
        emptyText:
          'We could not find approved pink rose bouquets in Sanity right now. Please browse all roses while the collection is updated.',
      },
      th: {
        seoTitle: 'กุหลาบชมพูในเชียงใหม่ | Lanna Bloom',
        seoDescription:
          'เลือกช่อกุหลาบชมพูในเชียงใหม่ พร้อมบริการจัดส่งวันเดียว เหมาะสำหรับวันเกิด ความรัก คำขอบคุณ และงานฉลอง',
        h1: 'กุหลาบชมพูในเชียงใหม่',
        eyebrow: 'โทนอ่อนหวาน ดอกไม้สดจากร้านท้องถิ่น',
        intro:
          'ช่อกุหลาบชมพูสำหรับวันเกิด ความรัก คำขอบคุณ และช่วงเวลาพิเศษ พร้อมจัดส่งในเชียงใหม่',
        primaryCta: 'เลือกกุหลาบชมพู',
        deliveryNote: 'สั่งก่อน 14:00 น. เพื่อจัดส่งวันเดียวเมื่อสินค้าพร้อมจำหน่าย',
        collectionTitle: 'คอลเลกชันกุหลาบชมพู',
        collectionIntro:
          'รายการช่อกุหลาบชมพูจาก Sanity catalog โดยกรองจากชนิดดอกกุหลาบและสีชมพู',
        addOnsTitle: 'ของเสริมที่เข้ากับช่อดอกไม้',
        addOnsIntro: 'เติมเต็มของขวัญด้วยตุ๊กตา ลูกโป่ง หรือชุดของขวัญจาก product catalog',
        trustItems: trustItems.th,
        deliveryTitle: 'จัดส่งในเชียงใหม่',
        deliveryText:
          'เราจัดส่งในตัวเมืองเชียงใหม่และอำเภอใกล้เคียง เวลาจัดส่งขึ้นอยู่กับสินค้า เส้นทาง และรายละเอียดตอนเช็คเอาต์',
        faqTitle: 'คำถามที่พบบ่อย',
        faq: commonFaq.th,
        emptyTitle: 'กำลังอัปเดตกุหลาบชมพู',
        emptyText:
          'ตอนนี้ยังไม่พบช่อกุหลาบชมพูที่อนุมัติแล้วใน Sanity โปรดดูช่อกุหลาบทั้งหมดระหว่างรออัปเดตคอลเลกชัน',
      },
    },
  },
  {
    slug: 'red-roses-chiang-mai',
    targetKeyword: 'red roses chiang mai',
    colorFilter: 'red',
    accentLabel: 'Red Roses',
    tabImageSrc: '/images_other/roses_colors_landingpage/red_roses.webp',
    canonicalPath: '/collections/red-roses-chiang-mai',
    filters: { topCategory: 'flowers', types: ['rose'], colors: ['red'] },
    copy: {
      en: {
        seoTitle: 'Red Roses in Chiang Mai | Lanna Bloom',
        seoDescription:
          'Order red rose bouquets in Chiang Mai with same-day delivery. Romantic red roses for anniversaries, proposals, and special moments.',
        h1: 'Red Roses in Chiang Mai',
        eyebrow: 'Romantic roses. Delivered beautifully.',
        intro:
          'Classic red rose bouquets for anniversaries, proposals, romantic surprises, and meaningful gifts across Chiang Mai.',
        primaryCta: 'Shop Red Roses',
        deliveryNote: 'Order before 2:00 PM for same-day delivery when available.',
        collectionTitle: 'Red Roses Collection',
        collectionIntro:
          'A focused selection of red rose bouquets from our Sanity catalog, filtered for rose type and red color.',
        addOnsTitle: 'Also perfect with your bouquet',
        addOnsIntro: 'Complete the gift with available teddy bears, balloons, or gift sets from our product catalog.',
        trustItems: trustItems.en,
        deliveryTitle: 'Delivery in Chiang Mai',
        deliveryText:
          'We deliver to Chiang Mai city and nearby districts. Delivery timing depends on bouquet availability, route, and checkout details.',
        faqTitle: 'Frequently Asked Questions',
        faq: commonFaq.en,
        emptyTitle: 'Red roses are being updated',
        emptyText:
          'We could not find approved red rose bouquets in Sanity right now. Please browse all roses while the collection is updated.',
      },
      th: {
        seoTitle: 'กุหลาบแดงในเชียงใหม่ | Lanna Bloom',
        seoDescription:
          'สั่งช่อกุหลาบแดงในเชียงใหม่ พร้อมบริการจัดส่งวันเดียว เหมาะสำหรับวันครบรอบ เซอร์ไพรส์ และช่วงเวลาพิเศษ',
        h1: 'กุหลาบแดงในเชียงใหม่',
        eyebrow: 'กุหลาบโรแมนติก จัดส่งอย่างสวยงาม',
        intro:
          'ช่อกุหลาบแดงคลาสสิกสำหรับวันครบรอบ การขอแต่งงาน เซอร์ไพรส์คนรัก และของขวัญสำคัญในเชียงใหม่',
        primaryCta: 'เลือกกุหลาบแดง',
        deliveryNote: 'สั่งก่อน 14:00 น. เพื่อจัดส่งวันเดียวเมื่อสินค้าพร้อมจำหน่าย',
        collectionTitle: 'คอลเลกชันกุหลาบแดง',
        collectionIntro:
          'รายการช่อกุหลาบแดงจาก Sanity catalog โดยกรองจากชนิดดอกกุหลาบและสีแดง',
        addOnsTitle: 'ของเสริมที่เข้ากับช่อดอกไม้',
        addOnsIntro: 'เติมเต็มของขวัญด้วยตุ๊กตา ลูกโป่ง หรือชุดของขวัญจาก product catalog',
        trustItems: trustItems.th,
        deliveryTitle: 'จัดส่งในเชียงใหม่',
        deliveryText:
          'เราจัดส่งในตัวเมืองเชียงใหม่และอำเภอใกล้เคียง เวลาจัดส่งขึ้นอยู่กับสินค้า เส้นทาง และรายละเอียดตอนเช็คเอาต์',
        faqTitle: 'คำถามที่พบบ่อย',
        faq: commonFaq.th,
        emptyTitle: 'กำลังอัปเดตกุหลาบแดง',
        emptyText:
          'ตอนนี้ยังไม่พบช่อกุหลาบแดงที่อนุมัติแล้วใน Sanity โปรดดูช่อกุหลาบทั้งหมดระหว่างรออัปเดตคอลเลกชัน',
      },
    },
  },
] satisfies CollectionLandingPageConfig[];

export function getCollectionLandingPages(): CollectionLandingPageConfig[] {
  return [...collectionLandingPages];
}

export function getCollectionLandingPage(slug: string): CollectionLandingPageConfig | undefined {
  return collectionLandingPages.find((page) => page.slug === slug);
}

export function getCollectionLandingTabs(lang: Locale) {
  return collectionLandingPages.map((page) => ({
    slug: page.slug,
    href: `/${lang}${page.canonicalPath}`,
    label: page.accentLabel,
    colorFilter: page.colorFilter,
    imageSrc: page.tabImageSrc,
  }));
}
