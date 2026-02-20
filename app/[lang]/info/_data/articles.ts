/**
 * Articles registry for the Guides / Info section.
 * Each article maps to a slug and MDX files:
 * - content/info/[slug].en.mdx (English)
 * - content/info/[slug].th.mdx (Thai)
 * If .th.mdx is missing, falls back to .en.mdx for Thai locale.
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
  publishedAt: string; // ISO date
  featured?: boolean;
  /** CTA links at bottom of article. If empty, default "Browse bouquets" link is shown. */
  ctaLinks?: ArticleCtaLink[];
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
    slug: 'how-to-order-flower-delivery-chiang-mai',
    title: 'How to Order Flower Delivery in Chiang Mai',
    excerpt:
      'Place an order on our website, then message us your order link or number to confirm details. Payment happens after confirmation. Delivery in Chiang Mai 08:00–20:00; orders after 18:00 may move to the next day.',
    titleTh: 'วิธีสั่งดอกไม้จัดส่งในเชียงใหม่',
    excerptTh:
      'สั่งซื้อบนเว็บไซต์ แล้วส่งลิงก์หรือหมายเลขออเดอร์มาที่แชทเพื่อยืนยันรายละเอียด ชำระเงินหลังยืนยัน จัดส่งในเชียงใหม่ 08:00–20:00 สั่งหลัง 18:00 อาจจัดส่งวันถัดไป',
    publishedAt: '2026-02-17T00:00:00.000Z',
    featured: false,
    cover: {
      type: 'gradient',
      gradientCss: 'linear-gradient(135deg, #f5e6e8 0%, #e8dfd0 50%, #e8f0ed 100%)',
      center: { kind: 'emoji', value: '🌸' },
    },
    ctaLinks: [
      { label: 'Browse bouquets', labelTh: 'เลือกช่อดอกไม้', href: '/catalog' },
      { label: 'Contact on LINE / WhatsApp / Telegram', labelTh: 'ติดต่อ LINE / WhatsApp / Telegram', href: '/contact' },
      { label: 'Refund & Replacement Policy', labelTh: 'นโยบายคืนเงินและเปลี่ยนสินค้า', href: '/refund-replacement' },
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
      { label: 'Browse rose bouquets', labelTh: 'ดูช่อกุหลาบ', href: '/catalog?category=roses' },
      { label: 'Red roses', labelTh: 'กุหลาบแดง', href: '/catalog?category=roses&colors=red' },
      { label: 'White roses', labelTh: 'กุหลาบขาว', href: '/catalog?category=roses&colors=white' },
      { label: 'Order now', labelTh: 'สั่งซื้อเลย', href: '/catalog' },
    ],
  },
  {
    slug: 'same-day-flower-delivery-chiang-mai',
    title: 'Same-day flower delivery in Chiang Mai',
    excerpt:
      'Need flowers delivered today? Order same-day flower delivery across Chiang Mai. Message us early for the best choice; we deliver during working hours (08:00–20:00).',
      titleTh: 'บริการส่งดอกไม้ในวันเดียวกันในเชียงใหม่',
      excerptTh: 'ต้องการส่งดอกไม้วันนี้ไหม? สั่งดอกไม้ส่งด่วนในวันเดียวกันทั่วเชียงใหม่ได้เลย ติดต่อเราล่วงหน้าเพื่อเลือกดอกไม้ที่ชอบที่สุด เราจัดส่งในช่วงเวลาทำการ (08:00–20:00)',
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
  return articles.filter((a) => a.slug !== excludeSlug);
}
