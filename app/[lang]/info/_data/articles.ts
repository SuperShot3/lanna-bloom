/**
 * Articles registry for the Guides / Info section.
 * Each article maps to a slug and usually MDX files:
 * - content/info/[slug].en.mdx (English)
 * - content/info/[slug].th.mdx (Thai)
 * If .th.mdx is missing, falls back to .en.mdx for Thai locale.
 *
 * Entries with `externalPath` skip MDX and redirect `/info/{slug}` to `/{locale}{externalPath}`.
 */

/** CTA link shown at bottom of article. href is path without lang (e.g. /catalog, /catalog?category=roses) */
export type ArticleCtaLink = {
  label: string;
  labelTh: string;
  href: string;
};

export type ArticleMeta = {
  slug: string;
  title: string;
  excerpt: string;
  /** Thai title (optional; falls back to title if missing) */
  titleTh?: string;
  /** Thai excerpt (optional; falls back to excerpt if missing) */
  excerptTh?: string;
  /**
   * If set, the info hub card links to `/{locale}{externalPath}` (e.g. guide route).
   * The `/info/{slug}` page redirects there; no MDX file is required for this slug.
   */
  externalPath?: string;
  publishedAt: string; // ISO date
  featured?: boolean;
  /** CTA links at bottom of article. If empty, default "Browse bouquets" link is shown. */
  ctaLinks?: ArticleCtaLink[];
  /** Optional CTA heading override for non-commercial articles. */
  ctaTitle?: string;
  ctaTitleTh?: string;
  cover:
    | {
        type: 'gradient';
        gradientCss: string;
        center: { kind: 'emoji' | 'icon' | 'text'; value: string };
      }
    | { type: 'image'; src: string; alt: string };
};

export const articles: ArticleMeta[] = [
  {
    slug: 'thai-breakfast-chiang-mai',
    title: 'Thai Breakfast in Chiang Mai: Jok, Patongko and Local Morning Spots',
    excerpt:
      'A personal local guide to Thai-style breakfast in Chiang Mai, including jok rice porridge, hot patongko, old-style Thai coffee, and favorite morning food spots.',
    titleTh: 'อาหารเช้าแบบไทยในเชียงใหม่: โจ๊ก ปาท่องโก๋ และร้านยามเช้า',
    excerptTh:
      'คู่มืออาหารเช้าแบบไทยในเชียงใหม่จากประสบการณ์ส่วนตัว ทั้งโจ๊ก ปาท่องโก๋ร้อน ๆ กาแฟโบราณ และร้านยามเช้าที่น่าแวะลอง',
    publishedAt: '2026-07-05T00:00:00.000Z',
    featured: false,
    cover: {
      type: 'gradient',
      gradientCss: 'linear-gradient(135deg, #fff7ed 0%, #fde68a 45%, #bbf7d0 100%)',
      center: { kind: 'emoji', value: '🍚' },
    },
    ctaTitle: 'Keep exploring Chiang Mai',
    ctaTitleTh: 'อ่านเรื่องเชียงใหม่ต่อ',
    ctaLinks: [
      { label: 'More guides', labelTh: 'คู่มืออื่น ๆ', href: '/info' },
      {
        label: 'Flower delivery to hotels',
        labelTh: 'ส่งดอกไม้ไปโรงแรม',
        href: '/info/flower-delivery-to-hotels-chiang-mai',
      },
    ],
  },
  {
    slug: 'gift-card-ideas-with-flowers',
    title: 'Gift Card Ideas with Flowers for Thoughtful Gifts',
    excerpt:
      'Short and thoughtful gift card ideas to pair with flowers—from romantic notes and birthday wishes to thank-you messages and simple standalone cards.',
    titleTh: 'ไอเดียการ์ดอวยพรคู่ดอกไม้สำหรับของขวัญที่ใส่ใจ',
    excerptTh:
      'ไอเดียการ์ดอวยพรสั้น ๆ ที่เข้ากับดอกไม้—ตั้งแต่ข้อความโรแมนติก อวยพรวันเกิด ขอบคุณ ไปจนถึงการ์ดที่ส่งแยกได้อย่างสวยงาม',
    publishedAt: '2026-07-04T00:00:00.000Z',
    featured: false,
    cover: {
      type: 'gradient',
      gradientCss: 'linear-gradient(135deg, #fff8f0 0%, #fce7f3 45%, #fef3c7 100%)',
      center: { kind: 'emoji', value: '💌' },
    },
    ctaLinks: [
      { label: 'Browse bouquets', labelTh: 'เลือกช่อดอกไม้', href: '/catalog' },
      { label: 'Red rose romance', labelTh: 'ช่อกุหลาบโรแมนติก', href: '/catalog/red-rose-romance' },
      { label: 'Contact us', labelTh: 'ติดต่อเรา', href: '/contact' },
    ],
  },
  {
    slug: 'plush-toys-teddy-bears-chiang-mai',
    title: 'Plush Toys and Teddy Bears Now Available at Lanna Bloom in Chiang Mai',
    excerpt:
      'Add a teddy bear or plush toy to selected flower orders in Chiang Mai—an easy way to make bouquets feel warmer, more personal, and more complete for birthdays, romance, get-well wishes, and long-distance gifts.',
    titleTh: 'ตุ๊กตานุ่มและหมีเท็ดดี้ที่ Lanna Bloom เชียงใหม่',
    excerptTh:
      'เพิ่มหมีเท็ดดี้หรือตุ๊กตานุ่มในบางออเดอร์ดอกไม้ในเชียงใหม่—วิธีง่าย ๆ ที่ทำให้ช่อดอกไม้ดูอบอุ่น เป็นส่วนตัว และครบมากขึ้น ไม่ว่าจะวันเกิด โรแมนติก อวยหายป่วย หรือของขวัญจากระยะไกล',
    publishedAt: '2026-04-10T00:00:00.000Z',
    featured: false,
    cover: {
      type: 'gradient',
      gradientCss:
        'linear-gradient(135deg, #fff8f5 0%, #fce4ec 45%, #e8eaf6 100%)',
      center: { kind: 'emoji', value: '🧸' },
    },
    ctaLinks: [
      { label: 'Browse bouquets', labelTh: 'เลือกช่อดอกไม้', href: '/catalog' },
      { label: 'Contact us', labelTh: 'ติดต่อเรา', href: '/contact' },
    ],
  },
  {
    slug: 'birthday-flower-gift-guide',
    title: 'Birthday Flower Gift Guide: Four Luxury Bouquets to Shop Now',
    excerpt:
      'Find a memorable birthday flower gift: compare four luxury bouquets—bold sunset, vivid citrus, timeless roses and lilies, romantic ruby—then shop online from each section.',
    titleTh: 'ไอเดียของขวัญดอกไม้วันเกิด: ช่อพรีเมียมสี่สไตล์',
    excerptTh:
      'เลือกของขวัญดอกไม้วันเกิดให้จำได้นาน: เปรียบเทียบช่อพรีเมียมสี่สไตล์—โทนซันเซ็ตสะดุดตา ซิตรัสสดใส กุหลาบและลิลลี่คลาสสิก โรแมนติกโทนรูบี้—แล้วเลือกซื้อออนไลน์ได้จากแต่ละหัวข้อ',
    externalPath: '/info/birthday-flower-gift',
    publishedAt: '2026-04-30T00:00:00.000Z',
    featured: false,
    cover: {
      type: 'gradient',
      gradientCss: 'linear-gradient(135deg, #fff5f7 0%, #fce7f3 45%, #fef3c7 100%)',
      center: { kind: 'emoji', value: '🎂' },
    },
    ctaLinks: [
      { label: 'Browse birthday flowers', labelTh: 'ดูดอกไม้วันเกิด', href: '/catalog?occasion=birthday' },
      { label: 'Browse bouquets', labelTh: 'เลือกช่อดอกไม้', href: '/catalog' },
    ],
  },
  {
    slug: 'order-flowers-website-vs-facebook-chiang-mai',
    title:
      'Why Ordering Flowers on a Website Can Be Easier Than Ordering Through Facebook Messages',
    excerpt:
      'Many people find flower shops on Facebook first—but chat orders can feel slow and unclear. Here is how using the website can make browsing, comparing, and ordering simpler, especially for busy customers and overseas buyers. Delivery is available in Chiang Mai and nearby areas only. See below for more details.',
    titleTh:
      'ทำไมการสั่งดอกไม้ผ่านเว็บไซต์อาจสะดวกกว่าการสั่งผ่านข้อความ Facebook',
    excerptTh:
      'หลายคนรู้จักร้านดอกไม้ผ่าน Facebook ก่อน แต่การสั่งทางแชทบางครั้งช้าและไม่ชัดเจน บทความนี้อธิบายว่าทำไมการใช้เว็บไซต์จึงช่วยให้ดูตัวเลือก เปรียบเทียบ และสั่งซื้อได้ง่ายขึ้น โดยเฉพาะลูกค้าที่ยุ่งหรือสั่งจากต่างประเทศ จัดส่งเฉพาะในเชียงใหม่และพื้นที่ใกล้เคียงเท่านั้น ดูรายละเอียดเพิ่มเติมด้านล่าง',
    publishedAt: '2026-04-02T00:00:00.000Z',
    featured: false,
    cover: {
      type: 'image',
      src: '/blog_images/order_onwebsite/lannabloom_website.webp',
      alt: 'Lanna Bloom website shown on a laptop',
    },
    ctaLinks: [{ label: 'Browse bouquets', labelTh: 'เลือกช่อดอกไม้', href: '/catalog' }],
  },
  {
    slug: 'birthday-flowers-chiang-mai-from-abroad',
    title: 'Send Flowers to Chiang Mai From Abroad: What to Expect',
    excerpt:
      'Ordering from another country should feel thoughtful, not stressful. Here is what overseas customers can expect when sending flowers to Chiang Mai: clear steps, secure checkout, and local delivery handled with care.',
    titleTh: 'ส่งดอกไม้ให้คนในเชียงใหม่จากต่างประเทศ: สิ่งที่ควรคาดหวัง',
    excerptTh:
      'การสั่งจากต่างประเทศควรรู้สึกใส่ใจ ไม่ใช่เครียด บทความนี้อธิบายขั้นตอน การชำระเงินออนไลน์ และการจัดส่งในพื้นที่อย่างใส่ใจ',
    publishedAt: '2026-04-03T00:00:00.000Z',
    featured: false,
    cover: {
      type: 'gradient',
      gradientCss: 'linear-gradient(135deg, #fff5f7 0%, #f0e6ff 50%, #e8f4fc 100%)',
      center: { kind: 'emoji', value: '🎂' },
    },
    ctaLinks: [
      { label: 'Browse bouquets', labelTh: 'เลือกช่อดอกไม้', href: '/catalog' },
      { label: 'Delivery policy', labelTh: 'นโยบายจัดส่ง', href: '/info/delivery-policy' },
    ],
  },
  {
    slug: 'rose-bouquets-chiang-mai', // URL-friendly, lowercase, hyphens (e.g. birthday-flowers)
    title: 'Rose Bouquets Delivery in Chiang Mai', // English title
    excerpt: 'Order beautiful rose bouquets and have them delivered across Chiang Mai. Same-day delivery during working hours. Message us via LINE or WhatsApp with your choice and delivery details.', // English excerpt (1–2 sentences)
    titleTh: 'บริการส่งช่อกุหลาบในเชียงใหม่', // Thai title
    excerptTh: 'สั่งช่อกุหลาบสวย ๆ พร้อมบริการจัดส่งทั่วเชียงใหม่ จัดส่งภายในวันเดียวได้ในช่วงเวลาทำการ ทักหาเราผ่าน LINE หรือ WhatsApp พร้อมแจ้งแบบช่อและรายละเอียดการจัดส่งได้เลย', // Thai excerpt (1–2 sentences)
    publishedAt: '2026-02-19T00:00:00.000Z', // ISO date
    featured: false, // true = shown in featured section at top
    cover: {
      type: 'gradient',
      gradientCss: 'linear-gradient(135deg, #fde2e4 0%, #f8edeb 50%, #e8dfd0 100%)',
      center: { kind: 'emoji', value: '🚕' },
    },
    ctaLinks: [
      { label: 'Browse rose bouquets', labelTh: 'ดูช่อกุหลาบ', href: '/catalog?types=rose' },
      { label: 'Red roses', labelTh: 'กุหลาบแดง', href: '/catalog?types=rose&colors=red' },
      { label: 'White roses', labelTh: 'กุหลาบขาว', href: '/catalog?types=rose&colors=white' },
      { label: 'Order now', labelTh: 'สั่งซื้อเลย', href: '/catalog' },
    ],
  },
  {
    slug: '51-roses-chiang-mai',
    title: '51 Roses Bouquet in Chiang Mai: Statement Rose Gifts',
    excerpt:
      'A 51 roses bouquet is a bold, beautiful choice for anniversaries, proposals, and romantic surprises in Chiang Mai. Compare classic red, soft pink, and red-and-white styles—then open any bouquet to see details and order.',
    titleTh: 'ช่อกุหลาบ 51 ดอกในเชียงใหม่: ของขวัญโรแมนติกที่โดดเด่น',
    excerptTh:
      'ช่อกุหลาบ 51 ดอกเป็นตัวเลือกที่สะดุดตาและโรแมนติก ไม่ว่าจะครบรอบ ขอแต่งงาน หรือเซอร์ไพรส์คนพิเศษในเชียงใหม่ เปรียบเทียบโทนแดงคลาสสิก ชมพูนุ่ม และแดง-ขาว—แล้วเปิดหน้าช่อเพื่อดูรายละเอียดและสั่งซื้อ',
    publishedAt: '2026-05-04T00:00:00.000Z',
    featured: false,
    cover: {
      type: 'gradient',
      gradientCss:
        'linear-gradient(135deg, #fff5f5 0%, #fce7f3 40%, #fecdd3 100%)',
      center: { kind: 'emoji', value: '🌹' },
    },
    ctaLinks: [
      { label: '51 red roses', labelTh: 'กุหลาบแดง 51 ดอก', href: '/catalog/51-red-roses' },
      { label: 'All rose bouquets', labelTh: 'ช่อกุหลาบทั้งหมด', href: '/info/rose-bouquets-chiang-mai' },
      { label: 'Browse the catalog', labelTh: 'ดูแคตตาล็อก', href: '/catalog?types=rose' },
    ],
  },
  {
    slug: 'same-day-flower-delivery-chiang-mai',
    title: 'Same-day flower delivery in Chiang Mai',
    excerpt:
      'Need flowers delivered today? Order same-day flower delivery across Chiang Mai. Message us early for the best choice; we deliver during working hours (09:00–20:00).',
      titleTh: 'บริการส่งดอกไม้ในวันเดียวกันในเชียงใหม่',
      excerptTh: 'ต้องการส่งดอกไม้วันนี้ไหม? สั่งดอกไม้ส่งด่วนในวันเดียวกันทั่วเชียงใหม่ได้เลย ติดต่อเราล่วงหน้าเพื่อเลือกดอกไม้ที่ชอบที่สุด เราจัดส่งในช่วงเวลาทำการ (09:00–20:00)',
    publishedAt: '2026-02-19T00:00:00.000Z',
    featured: false,
    cover: {
      type: 'gradient',
      gradientCss: 'linear-gradient(135deg, #e8f0ed 0%, #c8d9b8 50%, #a8c494 100%)',
      center: { kind: 'emoji', value: '🚚' },
    },
    ctaLinks: [
      { label: 'Order same-day delivery', labelTh: 'สั่งจัดส่งวันเดียว', href: '/catalog' },
      { label: 'Message us to order', labelTh: 'ทักสั่งซื้อ', href: '/contact' },
    ],
  },
  {
    slug: 'delivery-policy',
    title: 'Delivery Policy',
    excerpt:
      'How we deliver in every zone we serve: service hours 09:00–20:00, same-day guidance (orders after 18:00 usually roll to the next day), zones and fees at checkout, chat confirmation after you order online, and what we need for a smooth delivery. Custom requests or extra questions? Message us on LINE or WhatsApp.',
    titleTh: 'นโยบายการจัดส่ง',
    excerptTh:
      'สรุปการจัดส่งทุกโซนที่เราเปิดให้บริการ: เวลาให้บริการ 09:00–20:00 แนวทางจัดส่งภายในวัน (ออเดอร์หลัง 18:00 มักนัดวันถัดไป) โซนและค่าจัดส่งตอนเช็กเอาต์ การยืนยันทางแชทหลังสั่งบนเว็บ และข้อมูลที่อยู่ที่ควรเตรียม ต้องการงานพิเศษหรือสอบถามเพิ่มเติม ทัก LINE หรือ WhatsApp ได้เลย',
    publishedAt: '2026-02-20T00:00:00.000Z',
    featured: false,
    cover: {
      type: 'gradient',
      gradientCss: 'linear-gradient(135deg, #ffebee 0%, #ffcdd2 50%, #ef9a9a 100%)',
      center: { kind: 'emoji', value: '📧' },
    },
    ctaLinks: [
      { label: 'Browse bouquets', labelTh: 'เลือกช่อดอกไม้', href: '/catalog' },
      { label: 'Refund / Replacement / Cancellation Policy', labelTh: 'นโยบายคืนเงิน / เปลี่ยนสินค้า / ยกเลิก', href: '/refund-replacement' },
    ],
  },
  {
    slug: 'flower-delivery-to-hotels-chiang-mai',
    title: 'Flower Delivery to Hotels and Resorts in Chiang Mai',
    excerpt:
      'Planning a hotel surprise in Chiang Mai? Here is what to prepare—guest name, hotel details, timing—and bouquet ideas for romantic deliveries to hotels and resorts across the city.',
    publishedAt: '2026-06-12T00:00:00.000Z',
    featured: false,
    cover: {
      type: 'image',
      src: '/images_other/roses_colors_landingpage/red_roses.webp',
      alt: 'Red rose bouquet for romantic hotel flower delivery in Chiang Mai',
    },
    ctaLinks: [
      { label: 'Browse bouquets', labelTh: 'เลือกช่อดอกไม้', href: '/catalog' },
      { label: 'Rose bouquets', labelTh: 'ช่อกุหลาบ', href: '/info/rose-bouquets-chiang-mai' },
      { label: 'Delivery policy', labelTh: 'นโยบายจัดส่ง', href: '/info/delivery-policy' },
      { label: 'Contact us', labelTh: 'ติดต่อเรา', href: '/contact' },
    ],
  },
  {
    slug: 'flowers-for-men',
    title: 'Flowers for Men: Thoughtful Bouquet Ideas That Feel Right',
    excerpt:
      'Not sure what to send? Discover flowers for men that work—orchids, sunflowers, yellow lilies, rustic roses, and bright mixed bouquets—plus when to send them and how to order in Chiang Mai.',
    titleTh: 'ดอกไม้สำหรับผู้ชาย: ไอเดียช่อที่เหมาะและส่งได้จริง',
    excerptTh:
      'ไม่แน่ใจว่าควรส่งอะไร? แนะนำดอกไม้สำหรับผู้ชาย—กล้วยไม้ ทานตะวัน ลิลลี่เหลือง กุหลาบรัสติก และมิกซ์โทนสดใส—พร้อมโอกาสที่เหมาะและวิธีสั่งในเชียงใหม่',
    publishedAt: '2026-06-14T00:00:00.000Z',
    featured: false,
    cover: {
      type: 'gradient',
      gradientCss: 'linear-gradient(135deg, #fef9c3 0%, #fde68a 45%, #d9f99d 100%)',
      center: { kind: 'emoji', value: '🌻' },
    },
    ctaLinks: [
      { label: 'Shop orchids', labelTh: 'ดูกล้วยไม้', href: '/collections/orchids-chiang-mai' },
      { label: 'Sunflower bouquet', labelTh: 'ช่อทานตะวัน', href: '/catalog/sunflower-bouquet' },
      { label: 'Browse bouquets', labelTh: 'เลือกช่อดอกไม้', href: '/catalog' },
      { label: 'Same-day delivery', labelTh: 'จัดส่งวันเดียว', href: '/info/same-day-flower-delivery-chiang-mai' },
    ],
  },
  {
    slug: 'flower-delivery-to-hospitals-chiang-mai', // URL-friendly, lowercase, hyphens (e.g. birthday-flowers)
    title: 'How to Deliver Flowers to Hospitals in Chiang Mai', // English title
    excerpt: 'Sending flowers to someone in a hospital? Here’s the easiest way to arrange delivery in Chiang Mai, plus links to major hospitals to confirm addresses and contact numbers.', // English excerpt (1–2 sentences)
    titleTh: 'วิธีส่งดอกไม้ไปโรงพยาบาลในเชียงใหม่', // Thai title
    excerptTh: 'อยากส่งดอกไม้ให้คนที่อยู่โรงพยาบาล? คู่มือนี้อธิบายวิธีสั่งและจัดส่งในเชียงใหม่ พร้อมลิงก์ไปยังโรงพยาบาลหลักเพื่อเช็คที่อยู่และเบอร์ติดต่อ', // Thai excerpt (1–2 sentences)
    publishedAt: '2026-02-19T00:00:00.000Z', // ISO date
    featured: true, // true = shown in featured section at top
    cover: {
      type: 'gradient',
      gradientCss: 'linear-gradient(135deg, #fff1f2 0%, #f5f3ff 50%, #ecfeff 100%)',
      center: { kind: 'emoji', value: '🏥' },
    },
    ctaLinks: [
      { label: 'Order flowers for delivery', labelTh: 'สั่งดอกไม้จัดส่ง', href: '/catalog' },
      { label: 'Contact us', labelTh: 'ติดต่อเรา', href: '/contact' },
    ],
  },
];

export function getArticleBySlug(slug: string): ArticleMeta | undefined {
  return articles.find((a) => a.slug === slug);
}

/** Get localized title (lang: 'en' | 'th') */
export function getArticleTitle(article: ArticleMeta, lang: string): string {
  if (lang === 'th' && article.titleTh) return article.titleTh;
  return article.title;
}

/** Get localized excerpt (lang: 'en' | 'th') */
export function getArticleExcerpt(article: ArticleMeta, lang: string): string {
  if (lang === 'th' && article.excerptTh) return article.excerptTh;
  return article.excerpt;
}

const DEFAULT_CTA: ArticleCtaLink[] = [
  { label: 'Browse bouquets', labelTh: 'เลือกช่อดอกไม้', href: '/catalog' },
  { label: 'Order via LINE / WhatsApp', labelTh: 'สั่งผ่าน LINE / WhatsApp', href: '/contact' },
];

/** Get CTA links for article. Uses article's ctaLinks or default. */
export function getArticleCtaLinks(article: ArticleMeta, lang: string): ArticleCtaLink[] {
  const links = article.ctaLinks?.length ? article.ctaLinks : DEFAULT_CTA;
  return links;
}

export function getFeaturedArticle(): ArticleMeta {
  const featured = articles.find((a) => a.featured);
  return featured ?? articles[0];
}

export function getMoreGuides(excludeSlug?: string): ArticleMeta[] {
  const filtered = articles.filter((a) => a.slug !== excludeSlug);
  return [...filtered].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );
}
