import type { CatalogFilterParams } from '@/lib/catalogListLogic';
import type { Locale } from '@/lib/i18n';

export const ROSES_HUB_SLUG = 'roses-chiang-mai' as const;
export const ROSES_HUB_PATH = `/collections/${ROSES_HUB_SLUG}` as const;

export const ORCHIDS_HUB_SLUG = 'orchids-chiang-mai' as const;
export const ORCHIDS_HUB_PATH = `/collections/${ORCHIDS_HUB_SLUG}` as const;

export type HubFlowerType = 'rose' | 'orchid';

export type RoseColorFilter = 'white' | 'pink' | 'red';

/** @deprecated Color-specific paths redirect to the roses hub with ?color= */
export type LegacyRoseCollectionSlug =
  | 'white-roses-chiang-mai'
  | 'pink-roses-chiang-mai'
  | 'red-roses-chiang-mai';

export type CollectionLandingSlug = typeof ROSES_HUB_SLUG | typeof ORCHIDS_HUB_SLUG;

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

export type ColorLandingConfig = {
  colorFilter: string;
  accentLabel: string;
  tabImageSrc: string;
  legacySlug?: LegacyRoseCollectionSlug;
  filters: CatalogFilterParams;
  copy: Record<Locale, CollectionLandingCopy>;
};

export type RoseColorLandingConfig = ColorLandingConfig & {
  colorFilter: RoseColorFilter;
  tabImageSrc: `/images_other/roses_colors_landingpage/${string}`;
  legacySlug: LegacyRoseCollectionSlug;
};

export type CollectionHubCopy = Pick<
  CollectionLandingCopy,
  | 'seoTitle'
  | 'seoDescription'
  | 'h1'
  | 'eyebrow'
  | 'intro'
  | 'primaryCta'
  | 'deliveryNote'
  | 'trustItems'
  | 'deliveryTitle'
  | 'deliveryText'
  | 'faqTitle'
  | 'faq'
  | 'addOnsTitle'
  | 'addOnsIntro'
> &
  Partial<
    Pick<CollectionLandingCopy, 'collectionTitle' | 'collectionIntro' | 'emptyTitle' | 'emptyText'> & {
      typesTitle: string;
      typesIntro: string;
      orchidTypes: Array<{ name: string; aliases: string; description: string }>;
    }
  >;

export type RosesHubCopy = CollectionHubCopy;

export type CollectionHubConfig = {
  slug: CollectionLandingSlug;
  canonicalPath: string;
  flowerType: HubFlowerType;
  colorTabs: boolean;
  catalogFilters: CatalogFilterParams;
  copy: Record<Locale, CollectionHubCopy>;
  defaultColor?: string;
  colorLandings?: ColorLandingConfig[];
};

export type RosesHubConfig = CollectionHubConfig & {
  slug: typeof ROSES_HUB_SLUG;
  canonicalPath: typeof ROSES_HUB_PATH;
  flowerType: 'rose';
  colorTabs: true;
  defaultColor: RoseColorFilter;
  colorLandings: RoseColorLandingConfig[];
};

export type OrchidsHubConfig = CollectionHubConfig & {
  slug: typeof ORCHIDS_HUB_SLUG;
  canonicalPath: typeof ORCHIDS_HUB_PATH;
  flowerType: 'orchid';
  colorTabs: false;
};

export const DEFAULT_ROSE_COLOR: RoseColorFilter = 'white';

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
} satisfies Record<'en' | 'th', CollectionLandingCopy['trustItems']>;

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
} satisfies Record<'en' | 'th', CollectionLandingCopy['faq']>;

function withLocaleFallback<T>(copy: Record<'en' | 'th', T>): Record<Locale, T> {
  return { ...copy, ru: copy.en, 'zh-sg': copy.en, 'zh-hk': copy.en };
}

const rosesHubCopy = withLocaleFallback({
  en: {
    seoTitle: 'Rose Bouquets in Chiang Mai | Lanna Bloom',
    seoDescription:
      'Order rose bouquets in Chiang Mai with same-day delivery. Choose white, pink, or red roses, add teddy bears or balloons, and checkout securely.',
    h1: 'Rose Bouquets in Chiang Mai',
    eyebrow: 'Fresh roses. Handcrafted with love.',
    intro:
      'Choose white, pink, or red rose bouquets for anniversaries, birthdays, romance, and thoughtful gifts—delivered across Chiang Mai.',
    primaryCta: 'Shop Roses',
    deliveryNote: 'Order before 2:00 PM for same-day delivery when available.',
    addOnsTitle: 'Also perfect with your bouquet',
    addOnsIntro: 'Complete the gift with available teddy bears, balloons, or gift sets from our product catalog.',
    trustItems: trustItems.en,
    deliveryTitle: 'Delivery in Chiang Mai',
    deliveryText:
      'We deliver to Chiang Mai city and nearby districts. Delivery timing depends on bouquet availability, route, and checkout details.',
    faqTitle: 'Frequently Asked Questions',
    faq: commonFaq.en,
  },
  th: {
    seoTitle: 'ช่อกุหลาบในเชียงใหม่ | Lanna Bloom',
    seoDescription:
      'สั่งช่อกุหลาบในเชียงใหม่ พร้อมจัดส่งวันเดียว เลือกกุหลาบขาว ชมพู หรือแดง เพิ่มตุ๊กตา ลูกโป่ง และชำระเงินอย่างปลอดภัย',
    h1: 'ช่อกุหลาบในเชียงใหม่',
    eyebrow: 'กุหลาบสด จัดช่อด้วยความใส่ใจ',
    intro:
      'เลือกช่อกุหลาบขาว ชมพู หรือแดง สำหรับวันครบรอบ วันเกิด ความรัก และของขวัญพิเศษ พร้อมจัดส่งทั่วเชียงใหม่',
    primaryCta: 'เลือกช่อกุหลาบ',
    deliveryNote: 'สั่งก่อน 14:00 น. เพื่อจัดส่งวันเดียวเมื่อสินค้าพร้อมจำหน่าย',
    addOnsTitle: 'ของเสริมที่เข้ากับช่อดอกไม้',
    addOnsIntro: 'เติมเต็มของขวัญด้วยตุ๊กตา ลูกโป่ง หรือชุดของขวัญจาก product catalog',
    trustItems: trustItems.th,
    deliveryTitle: 'จัดส่งในเชียงใหม่',
    deliveryText:
      'เราจัดส่งในตัวเมืองเชียงใหม่และอำเภอใกล้เคียง เวลาจัดส่งขึ้นอยู่กับสินค้า เส้นทาง และรายละเอียดตอนเช็คเอาต์',
    faqTitle: 'คำถามที่พบบ่อย',
    faq: commonFaq.th,
  },
}) satisfies Record<'en' | 'th', RosesHubCopy>;

export const roseColorLandings = [
  {
    colorFilter: 'white',
    accentLabel: 'White Roses',
    tabImageSrc: '/images_other/roses_colors_landingpage/white_roses.webp',
    legacySlug: 'white-roses-chiang-mai',
    filters: { topCategory: 'flowers', types: ['rose'], colors: ['white'] },
    copy: withLocaleFallback({
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
    }),
  },
  {
    colorFilter: 'pink',
    accentLabel: 'Pink Roses',
    tabImageSrc: '/images_other/roses_colors_landingpage/pink_roses.webp',
    legacySlug: 'pink-roses-chiang-mai',
    filters: { topCategory: 'flowers', types: ['rose'], colors: ['pink'] },
    copy: withLocaleFallback({
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
    }),
  },
  {
    colorFilter: 'red',
    accentLabel: 'Red Roses',
    tabImageSrc: '/images_other/roses_colors_landingpage/red_roses.webp',
    legacySlug: 'red-roses-chiang-mai',
    filters: { topCategory: 'flowers', types: ['rose'], colors: ['red'] },
    copy: withLocaleFallback({
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
    }),
  },
] satisfies RoseColorLandingConfig[];

export const rosesHub: RosesHubConfig = {
  slug: ROSES_HUB_SLUG,
  canonicalPath: ROSES_HUB_PATH,
  flowerType: 'rose',
  colorTabs: true,
  catalogFilters: { topCategory: 'flowers', types: ['rose'] },
  defaultColor: DEFAULT_ROSE_COLOR,
  copy: rosesHubCopy,
  colorLandings: roseColorLandings,
};

const legacySlugToColor = Object.fromEntries(
  roseColorLandings.map((page) => [page.legacySlug, page.colorFilter])
) as Record<LegacyRoseCollectionSlug, RoseColorFilter>;

const orchidFaq = {
  en: [
    {
      q: 'Do you offer same-day orchid delivery in Chiang Mai?',
      a: 'Yes. Same-day delivery is available in Chiang Mai during working hours when the selected orchid arrangement is available.',
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
      q: 'มีบริการส่งกล้วยไม้วันเดียวในเชียงใหม่ไหม?',
      a: 'มีบริการจัดส่งวันเดียวในเชียงใหม่ในเวลาทำการ เมื่อช่อกล้วยไม้ที่เลือกพร้อมจำหน่าย',
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
} satisfies Record<'en' | 'th', CollectionLandingCopy['faq']>;

const orchidsHubCopy = withLocaleFallback({
  en: {
    seoTitle: 'Orchid in Chiang Mai | Lanna Bloom',
    seoDescription:
      'Order orchids in Chiang Mai with same-day delivery. Phalaenopsis (moth orchids), Dendrobium, Cymbidium, and more—for celebrations, respect, and elegant gifts.',
    h1: 'Orchid in Chiang Mai',
    eyebrow: 'Elegant orchids. Handcrafted with care.',
    intro:
      'Fresh orchid arrangements for celebrations, respect, and thoughtful gifts—delivered across Chiang Mai. Our catalog includes popular types such as Phalaenopsis (moth orchids), Dendrobium, Cymbidium, and other varieties partners arrange by season.',
    primaryCta: 'Shop Orchids',
    deliveryNote: 'Order before 2:00 PM for same-day delivery when available.',
    addOnsTitle: 'Also perfect with your bouquet',
    addOnsIntro: 'Complete the gift with available teddy bears, balloons, or gift sets from our product catalog.',
    trustItems: trustItems.en,
    deliveryTitle: 'Delivery in Chiang Mai',
    deliveryText:
      'We deliver to Chiang Mai city and nearby districts. Delivery timing depends on bouquet availability, route, and checkout details.',
    faqTitle: 'Frequently Asked Questions',
    faq: orchidFaq.en,
    typesTitle: 'Orchid types you may see',
    typesIntro:
      'Florists and product names often use botanical or common English names. These are among the orchids commonly used in Chiang Mai bouquets and gift arrangements:',
    orchidTypes: [
      {
        name: 'Phalaenopsis',
        aliases: 'Moth orchid, butterfly orchid',
        description:
          'The most popular gift orchid in Thailand—graceful arching sprays, long-lasting blooms, and a refined look for home or office.',
      },
      {
        name: 'Dendrobium',
        aliases: 'Singapore orchid (common trade name)',
        description:
          'Slender stems with clusters of blooms; widely used in modern bouquets, congratulatory gifts, and tropical arrangements.',
      },
      {
        name: 'Cymbidium',
        aliases: 'Boat orchid',
        description:
          'Larger, waxy flowers on sturdy stems—often chosen for premium bouquets and formal celebrations.',
      },
      {
        name: 'Vanda',
        aliases: 'Singapore orchid (regional usage varies)',
        description:
          'Bold tropical orchids with open, vivid flowers—popular for striking color in contemporary designs.',
      },
      {
        name: 'Oncidium',
        aliases: 'Dancing Lady orchid',
        description:
          'Many small blooms on branched sprays—adds texture and movement to mixed orchid arrangements.',
      },
      {
        name: 'Cattleya',
        aliases: 'Corsage orchid',
        description:
          'Classic showy blooms with a luxurious feel—sometimes featured as focal flowers in special-occasion work.',
      },
      {
        name: 'Paphiopedilum',
        aliases: "Lady's Slipper orchid",
        description:
          'Distinctive pouch-shaped flowers—valued for unique shape in curated, high-end orchid gifts.',
      },
    ],
    collectionTitle: 'Orchids in Chiang Mai',
    collectionIntro:
      'All orchid arrangements available for Chiang Mai delivery from our catalog—browse styles below and order online.',
    emptyTitle: 'Orchids are being updated',
    emptyText:
      'We could not find approved orchid products in Sanity right now. Please browse the full catalog while the collection is updated.',
  },
  th: {
    seoTitle: 'กล้วยไม้ในเชียงใหม่ | Lanna Bloom',
    seoDescription:
      'สั่งกล้วยไม้ในเชียงใหม่ พร้อมจัดส่งวันเดียว ฟาเลนออปซิส (แมลงปอ) เดนโดรเบียม ซิมบิเดียม และอื่น ๆ สำหรับงานฉลองและของขวัญสุภาพ',
    h1: 'กล้วยไม้ในเชียงใหม่',
    eyebrow: 'กล้วยไม้สง่างาม จัดช่อด้วยความใส่ใจ',
    intro:
      'กล้วยไม้สดสำหรับงานฉลอง แสดงความเคาระ และของขวัญพิเศษ พร้อมจัดส่งทั่วเชียงใหม่ ในคอลเลกชันมีทั้งฟาเลนออปซิส (กล้วยไม้แมลงปอ) เดนโดรเบียม ซิมบิเดียม และสายพันธุ์อื่นตามฤดูกาลจากพาร์ทเนอร์',
    primaryCta: 'เลือกกล้วยไม้',
    deliveryNote: 'สั่งก่อน 14:00 น. เพื่อจัดส่งวันเดียวเมื่อสินค้าพร้อมจำหน่าย',
    addOnsTitle: 'ของเสริมที่เข้ากับช่อดอกไม้',
    addOnsIntro: 'เติมเต็มของขวัญด้วยตุ๊กตา ลูกโป่ง หรือชุดของขวัญจาก product catalog',
    trustItems: trustItems.th,
    deliveryTitle: 'จัดส่งในเชียงใหม่',
    deliveryText:
      'เราจัดส่งในตัวเมืองเชียงใหม่และอำเภอใกล้เคียง เวลาจัดส่งขึ้นอยู่กับสินค้า เส้นทาง และรายละเอียดตอนเช็คเอาต์',
    faqTitle: 'คำถามที่พบบ่อย',
    faq: orchidFaq.th,
    typesTitle: 'สายพันธุ์กล้วยไม้ที่พบบ่อย',
    typesIntro:
      'ชื่อทางพฤกษศาสตร์หรือชื่อสามัญมักปรากฏบนช่อหรือในรายละเอียดสินค้า ตัวอย่างสายพันธุ์ที่นิยมใช้ในช่อกล้วยไม้เชียงใหม่:',
    orchidTypes: [
      {
        name: 'ฟาเลนออปซิส (Phalaenopsis)',
        aliases: 'กล้วยไม้แมลงปอ, Moth orchid',
        description:
          'ของขวัญยอดนิยม—ช่อโค้งสง่า ดอกคงทนนาน เหมาะบ้านและที่ทำงาน',
      },
      {
        name: 'เดนโดรเบียม (Dendrobium)',
        aliases: 'Singapore orchid (ชื่อเรียกในตลาด)',
        description:
          'ก้านเรียวดอกเป็นช่อ—ใช้บ่อยในช่อโมเดิร์น งานแสดงความยินดี และจัดดอกไม้โทนเขตร้อน',
      },
      {
        name: 'ซิมบิเดียม (Cymbidium)',
        aliases: 'Boat orchid',
        description:
          'ดอกใหญ่กลีบหนา ก้านแข็ง—มักเลือกสำหรับช่อพรีเมียมและงานพิธีการ',
      },
      {
        name: 'แวนด้า (Vanda)',
        aliases: 'กล้วยไม้โทนสด',
        description:
          'ดอกเปิดกว้างสีจัด—นิยมในดีไซน์ร่วมสมัยที่ต้องการจุดเด่น',
      },
      {
        name: 'ออนซิเดียม (Oncidium)',
        aliases: 'Dancing Lady orchid',
        description:
          'ดอกเล็กจำนวนมากบนช่อแตกแขนง—เพิ่มมิติในช่อกล้วยไม้ผสม',
      },
      {
        name: 'แคตตลียา (Cattleya)',
        aliases: 'Corsage orchid',
        description:
          'ดอกโชว์คลาสสิกหรูหรา—บางครั้งใช้เป็นดอกเด่นในงานพิเศษ',
      },
      {
        name: 'ปาฟิโอเพดิลัม (Paphiopedilum)',
        aliases: "Lady's Slipper orchid",
        description:
          'ดอกทรงถุงเฉพาะตัว—เหมาะของขวัญกล้วยไม้ที่ต้องการความแตกต่าง',
      },
    ],
    collectionTitle: 'กล้วยไม้ในเชียงใหม่',
    collectionIntro:
      'กล้วยไม้ทั้งหมดที่จัดส่งได้ในเชียงใหม่จากคอลเลกชันของเรา—เลือกสไตล์ด้านล่างและสั่งออนไลน์',
    emptyTitle: 'กำลังอัปเดตกล้วยไม้',
    emptyText:
      'ตอนนี้ยังไม่พบกล้วยไม้ที่อนุมัติแล้วใน Sanity โปรดดูแคตตาล็อกทั้งหมดระหว่างรออัปเดตคอลเลกชัน',
  },
}) satisfies Record<'en' | 'th', CollectionHubCopy>;

export const orchidsHub: OrchidsHubConfig = {
  slug: ORCHIDS_HUB_SLUG,
  canonicalPath: ORCHIDS_HUB_PATH,
  flowerType: 'orchid',
  colorTabs: false,
  catalogFilters: { topCategory: 'flowers', types: ['orchid'] },
  copy: orchidsHubCopy,
};

const COLLECTION_HUBS: CollectionHubConfig[] = [rosesHub, orchidsHub];

export function getCollectionHub(slug: string): CollectionHubConfig | undefined {
  return COLLECTION_HUBS.find((hub) => hub.slug === slug);
}

export function parseHubColorParam(
  hub: CollectionHubConfig,
  value: string | string[] | undefined
): string {
  if (!hub.colorTabs || !hub.colorLandings?.length || !hub.defaultColor) {
    throw new Error(`Hub ${hub.slug} does not use color tabs`);
  }
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw && hub.colorLandings.some((page) => page.colorFilter === raw)) {
    return raw;
  }
  return hub.defaultColor;
}

export function getHubColorLanding(hub: CollectionHubConfig, color: string): ColorLandingConfig {
  if (!hub.colorLandings?.length) {
    throw new Error(`Hub ${hub.slug} does not use color landings`);
  }
  const page = hub.colorLandings.find((entry) => entry.colorFilter === color);
  if (!page) throw new Error(`Unknown color "${color}" for hub ${hub.slug}`);
  return page;
}

export type HubCatalogView = {
  filters: CatalogFilterParams;
  collectionTitle: string;
  collectionIntro: string;
  emptyTitle: string;
  emptyText: string;
  activeColor?: string;
};

export function getHubCatalogView(
  hub: CollectionHubConfig,
  locale: Locale,
  colorParam?: string | string[]
): HubCatalogView {
  if (hub.colorTabs) {
    const color = parseHubColorParam(hub, colorParam);
    const colorPage = getHubColorLanding(hub, color);
    const copy = colorPage.copy[locale];
    return {
      filters: colorPage.filters,
      collectionTitle: copy.collectionTitle,
      collectionIntro: copy.collectionIntro,
      emptyTitle: copy.emptyTitle,
      emptyText: copy.emptyText,
      activeColor: color,
    };
  }
  const copy = hub.copy[locale];
  return {
    filters: hub.catalogFilters,
    collectionTitle: copy.collectionTitle ?? '',
    collectionIntro: copy.collectionIntro ?? '',
    emptyTitle: copy.emptyTitle ?? '',
    emptyText: copy.emptyText ?? '',
  };
}

export function parseRoseColorParam(value: string | string[] | undefined): RoseColorFilter {
  return parseHubColorParam(rosesHub, value) as RoseColorFilter;
}

export function getRoseColorFromLegacySlug(slug: string): RoseColorFilter | undefined {
  return legacySlugToColor[slug as LegacyRoseCollectionSlug];
}

export function getRoseColorLanding(color: RoseColorFilter): RoseColorLandingConfig {
  return getHubColorLanding(rosesHub, color) as RoseColorLandingConfig;
}

export function getCollectionLandingPages(): { slug: CollectionLandingSlug; path: string }[] {
  return COLLECTION_HUBS.map((hub) => ({ slug: hub.slug as CollectionLandingSlug, path: hub.canonicalPath }));
}

export function isCollectionHubSlug(slug: string): slug is CollectionLandingSlug {
  return COLLECTION_HUBS.some((hub) => hub.slug === slug);
}

export function isRosesHubSlug(slug: string): slug is typeof ROSES_HUB_SLUG {
  return slug === ROSES_HUB_SLUG;
}

export function getCollectionLandingTabs(hub: CollectionHubConfig, lang: Locale) {
  if (!hub.colorTabs || !hub.colorLandings?.length) return [];
  return hub.colorLandings.map((page) => ({
    colorFilter: page.colorFilter,
    href: `/${lang}${hub.canonicalPath}?color=${page.colorFilter}`,
    label: page.accentLabel,
    imageSrc: page.tabImageSrc,
  }));
}
