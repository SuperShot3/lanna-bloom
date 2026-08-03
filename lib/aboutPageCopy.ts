/**
 * Bilingual copy for /[lang]/about
 */

import type { Locale } from '@/lib/i18n';

export const DBD_BANNER_URL =
  'https://dbdregistered.dbd.go.th/api/public/banner?param=867714DAF3E4ED6944FA5672C4E6D1C4A2114631CF57F4DB847153673BC31A6B';
export const DBD_VERIFY_URL =
  'https://dbdregistered.dbd.go.th/api/public/shopinfo?param=867714DAF3E4ED6944FA5672C4E6D1C4A2114631CF57F4DB847153673BC31A6B';

/** Inline segment: plain text, bold emphasis, or link (href without locale prefix). */
export type AboutSegment =
  | { type: 'text'; text: string }
  | { type: 'bold'; text: string }
  | { type: 'link'; text: string; href: string; external?: boolean };

export type AboutRichParagraph = AboutSegment[];

export type AboutQuickLink = { label: string; href: string };

export type AboutPageCopy = {
  metaTitle: string;
  metaDescription: string;
  h1: string;
  tagline: string;
  /** Opening paragraphs with optional bold phrases and inline links */
  intro: AboutRichParagraph[];
  /** Shortcuts for readers */
  quickLinks: {
    title: string;
    links: AboutQuickLink[];
  };
  whatWeBelieve: { title: string; paragraphs: string[]; bullets: string[] };
  supportingSellers: { title: string; paragraphs: string[] };
  startupGrowing: { title: string; paragraphs: string[] };
  whatWeAreBuilding: {
    title: string;
    intro: string;
    bullets: string[];
    closing: string[];
  };
  platformUpdates: {
    title: string;
    /** Short intro for the snippet card */
    snippetIntro: string;
    lastUpdatedLabel: string;
    /** ISO 8601 date (YYYY-MM-DD) for <time dateTime> */
    lastUpdatedIso: string;
    /** Human-readable date shown in the snippet */
    lastUpdatedDisplay: string;
    highlightsTitle: string;
    /** Major milestones — edit when you ship something notable */
    highlights: string[];
    newsletterTitle: string;
    newsletterHint: string;
    emailPlaceholder: string;
    joinButton: string;
    newsletterSubscribing: string;
    newsletterSuccess: string;
    newsletterAlreadySubscribed: string;
    newsletterError: string;
    newsletterInvalidEmail: string;
  };
  lookingAhead: { title: string; paragraphs: string[] };
  dbdVerification: {
    title: string;
    explanation: string;
    verifyLinkText: string;
  };
};

const baseAboutPageCopy: Record<'en' | 'th', AboutPageCopy> = {
  en: {
    metaTitle: 'About Lanna Bloom | Flower & gift delivery Chiang Mai',
    metaDescription:
      'Lanna Bloom delivers flowers and gifts in Chiang Mai and selected areas of Thailand — order online with secure checkout and reliable local delivery.',
    h1: 'About Lanna Bloom',
    tagline: 'A local way to send thoughtful flowers and gifts across Chiang Mai — and selected destinations in Thailand.',
    intro: [
      [
        { type: 'text', text: 'Lanna Bloom is a ' },
        { type: 'bold', text: 'Chiang Mai-based flower and gift delivery service' },
        {
          type: 'text',
          text: '. We bring carefully presented products from local florists, makers, and independent sellers into one clear place to browse and order.',
        },
      ],
      [
        { type: 'text', text: 'Our aim is practical: make it easier to ' },
        { type: 'bold', text: 'send something meaningful' },
        {
          type: 'text',
          text: ', whether you are ordering from nearby or from abroad, while helping local creative businesses reach more customers.',
        },
      ],
    ],
    quickLinks: {
      title: 'Explore Lanna Bloom',
      links: [
        { label: 'Shop — flowers & gifts', href: '/catalog' },
        { label: 'Guides & how to order', href: '/info' },
        { label: 'Delivery policy', href: '/info/delivery-policy' },
        { label: 'Contact us', href: '/contact' },
        { label: 'Become a partner', href: '/partner/how-it-works' },
        { label: 'Customer reviews', href: '/reviews' },
      ],
    },
    whatWeBelieve: {
      title: 'What we believe',
      paragraphs: [
        'Beautiful local products should be easy to discover and straightforward to order.',
        'Many talented florists and makers still sell mainly through scattered social posts and private messages. We give their work a clearer storefront, while giving customers transparent choices, delivery information, and secure checkout.',
      ],
      bullets: [
        'Local creativity, presented with care',
        'Clear product and delivery information',
        'A simpler ordering experience',
        'Trust for customers ordering near or far',
      ],
    },
    supportingSellers: {
      title: 'Built with local businesses in mind',
      paragraphs: [
        'We help local florists, small sellers, and craftspeople present their work professionally and reach people who are actively looking for flowers and thoughtful gifts.',
        'Our catalog is growing beyond bouquets to include selected gifts and handmade products, while Chiang Mai remains the heart of our service.',
      ],
    },
    startupGrowing: {
      title: 'Growing carefully',
      paragraphs: [
        'Lanna Bloom is an independent local startup. We improve the service step by step, guided by real orders, customer feedback, partner needs, and the practical realities of local delivery.',
        'We are expanding to selected destinations in Thailand carefully. Availability, delivery fees, and same-day service can vary by city.',
      ],
    },
    whatWeAreBuilding: {
      title: 'What we are building',
      intro: 'Every improvement is guided by four priorities:',
      bullets: [
        'Easy for customers to use',
        'Useful for local sellers',
        'Clear, trustworthy, and practical',
        'Designed around real local delivery',
      ],
      closing: [
        'The result should feel simple for the customer and genuinely useful for the local businesses behind each order.',
      ],
    },
    platformUpdates: {
      title: 'Platform updates',
      snippetIntro:
        'We post major platform milestones here when they land. Smaller changes happen continuously — if you want news, tips, and offers in your inbox, subscribe below.',
      lastUpdatedLabel: 'Last updated',
      lastUpdatedIso: '2026-08-03',
      lastUpdatedDisplay: 'August 2026',
      highlightsTitle: 'Recently shipped',
      highlights: [
        'Added a Flowers in a box category for more ways to choose and send',
        'Gift orders can now include up to three separate card messages',
        'Each gift-card message can now contain up to 240 characters, increased from 160',
        'Improved product carousels and catalog filters for easier browsing',
        'Launched an interactive Chiang Mai delivery areas and fees page',
        'Continued website performance work and added real-user Core Web Vitals monitoring',
        'Expanded destination guidance for selected delivery cities in Thailand',
      ],
      newsletterTitle: 'Newsletter',
      newsletterHint:
        'Interested in what we ship next? Get occasional updates — no spam, unsubscribe anytime.',
      emailPlaceholder: 'Your email',
      joinButton: 'Subscribe',
      newsletterSubscribing: 'Subscribing…',
      newsletterSuccess: "You're subscribed! We'll send you tips and offers.",
      newsletterAlreadySubscribed: "You're already subscribed.",
      newsletterError: 'Something went wrong. Please try again.',
      newsletterInvalidEmail: 'Please enter a valid email address.',
    },
    lookingAhead: {
      title: 'Looking ahead',
      paragraphs: [
        'We will keep improving how customers discover, personalize, and send gifts while creating practical opportunities for local florists and makers.',
        'Thank you for supporting an independent Chiang Mai startup as we grow.',
      ],
    },
    dbdVerification: {
      title: 'DBD Verified (Thailand)',
      explanation:
        'Lanna Bloom is a DBD Verified online business in Thailand (Department of Business Development, Ministry of Commerce). This verification supports transparency and customer trust for online orders.',
      verifyLinkText: 'Verify on DBD (opens official page)',
    },
  },
  th: {
    metaTitle: 'เกี่ยวกับ Lanna Bloom | ส่งดอกไม้และของขวัญ เชียงใหม่',
    metaDescription:
      'Lanna Bloom ส่งดอกไม้และของขวัญในเชียงใหม่และพื้นที่ที่เลือกทั่วประเทศไทย — สั่งออนไลน์ชำระเงินปลอดภัย จัดส่งในพื้นที่อย่างน่าเชื่อถือ',
    h1: 'เกี่ยวกับ Lanna Bloom',
    tagline: 'บริการท้องถิ่นสำหรับส่งดอกไม้และของขวัญที่มีความหมายในเชียงใหม่ และพื้นที่ที่เราให้บริการในประเทศไทย',
    intro: [
      [
        { type: 'text', text: 'Lanna Bloom คือ ' },
        { type: 'bold', text: 'บริการส่งดอกไม้และของขวัญจากเชียงใหม่' },
        {
          type: 'text',
          text: ' ที่รวบรวมสินค้าจากร้านดอกไม้ ผู้ผลิตงานฝีมือ และผู้ขายอิสระในท้องถิ่นไว้ในที่เดียว ให้เลือกดูและสั่งซื้อได้อย่างชัดเจน',
        },
      ],
      [
        { type: 'text', text: 'เป้าหมายของเราตรงไปตรงมา คือทำให้การ ' },
        { type: 'bold', text: 'ส่งสิ่งที่มีความหมาย' },
        {
          type: 'text',
          text: ' ง่ายขึ้น ไม่ว่าคุณจะสั่งจากใกล้บ้านหรือต่างประเทศ พร้อมช่วยให้ธุรกิจสร้างสรรค์ในท้องถิ่นเข้าถึงลูกค้าได้มากขึ้น',
        },
      ],
    ],
    quickLinks: {
      title: 'สำรวจ Lanna Bloom',
      links: [
        { label: 'ร้านค้า — ดอกไม้และของขวัญ', href: '/catalog' },
        { label: 'คู่มือและวิธีสั่ง', href: '/info' },
        { label: 'นโยบายการจัดส่ง', href: '/info/delivery-policy' },
        { label: 'ติดต่อเรา', href: '/contact' },
        { label: 'สมัครเป็นพาร์ทเนอร์', href: '/partner/how-it-works' },
        { label: 'รีวิวจากลูกค้า', href: '/reviews' },
      ],
    },
    whatWeBelieve: {
      title: 'สิ่งที่เราเชื่อ',
      paragraphs: [
        'สินค้าท้องถิ่นที่สวยงามควรถูกค้นพบได้ง่ายและสั่งซื้อได้อย่างตรงไปตรงมา',
        'ร้านดอกไม้และผู้สร้างสรรค์จำนวนมากยังขายผ่านโพสต์โซเชียลและแชทที่กระจัดกระจาย เราช่วยนำเสนอผลงานให้ชัดเจนขึ้น พร้อมให้ลูกค้าเห็นตัวเลือก ข้อมูลการจัดส่ง และขั้นตอนชำระเงินที่ปลอดภัย',
      ],
      bullets: [
        'งานสร้างสรรค์ท้องถิ่นที่นำเสนออย่างใส่ใจ',
        'ข้อมูลสินค้าและการจัดส่งที่ชัดเจน',
        'ขั้นตอนสั่งซื้อที่ง่ายขึ้น',
        'ความมั่นใจสำหรับผู้สั่งทั้งใกล้และไกล',
      ],
    },
    supportingSellers: {
      title: 'สร้างโดยคำนึงถึงธุรกิจท้องถิ่น',
      paragraphs: [
        'เราช่วยให้ร้านดอกไม้ ผู้ขายรายย่อย และช่างฝีมือในท้องถิ่นนำเสนอผลงานอย่างมืออาชีพ และเข้าถึงผู้ที่กำลังมองหาดอกไม้และของขวัญที่ใส่ใจ',
        'แคตตาล็อกของเรากำลังเติบโตจากช่อดอกไม้ไปสู่ของขวัญและสินค้าทำมือที่คัดสรร โดยมีเชียงใหม่เป็นหัวใจหลักของบริการ',
      ],
    },
    startupGrowing: {
      title: 'เติบโตอย่างรอบคอบ',
      paragraphs: [
        'Lanna Bloom เป็นสตาร์ทอัพท้องถิ่นอิสระ เราปรับปรุงบริการทีละขั้นจากคำสั่งซื้อจริง ความเห็นของลูกค้า ความต้องการของพาร์ทเนอร์ และข้อเท็จจริงของการจัดส่งในพื้นที่',
        'เราค่อยๆ ขยายไปยังพื้นที่ที่เลือกในประเทศไทย โดยสินค้า ค่าจัดส่ง และบริการส่งภายในวันเดียวกันอาจแตกต่างกันในแต่ละเมือง',
      ],
    },
    whatWeAreBuilding: {
      title: 'สิ่งที่เรากำลังสร้าง',
      intro: 'ทุกการปรับปรุงของเรายึดหลัก 4 ข้อ:',
      bullets: [
        'ใช้งานง่ายสำหรับลูกค้า',
        'เป็นประโยชน์ต่อผู้ขายท้องถิ่น',
        'ชัดเจน น่าเชื่อถือ และใช้งานได้จริง',
        'ออกแบบตามการจัดส่งในพื้นที่จริง',
      ],
      closing: [
        'ผลลัพธ์ควรเรียบง่ายสำหรับลูกค้าและเป็นประโยชน์จริงต่อธุรกิจท้องถิ่นที่อยู่เบื้องหลังทุกคำสั่งซื้อ',
      ],
    },
    platformUpdates: {
      title: 'อัปเดตแพลตฟอร์ม',
      snippetIntro:
        'เราโพสต์เหตุการณ์สำคัญของแพลตฟอร์มที่นี่เมื่อมีการปล่อยจริง ส่วนการปรับย่อยเกิดขึ้นตลอด — ถ้าต้องการข่าว เคล็ดลับ และโปรในอีเมล สมัครรับจดหมายด้านล่าง',
      lastUpdatedLabel: 'อัปเดตล่าสุด',
      lastUpdatedIso: '2026-08-03',
      lastUpdatedDisplay: 'สิงหาคม 2026',
      highlightsTitle: 'อัปเดตล่าสุด',
      highlights: [
        'เพิ่มหมวดดอกไม้ในกล่อง เพื่อให้มีตัวเลือกในการส่งมากขึ้น',
        'หนึ่งคำสั่งซื้อสามารถใส่ข้อความในการ์ดแยกกันได้สูงสุด 3 ใบ',
        'เพิ่มความยาวข้อความในการ์ดจาก 160 เป็นสูงสุด 240 ตัวอักษรต่อใบ',
        'ปรับปรุงแถบเลื่อนสินค้าและตัวกรองแคตตาล็อกให้เลือกดูได้ง่ายขึ้น',
        'เปิดหน้าแผนที่พื้นที่และค่าจัดส่งในเชียงใหม่แบบโต้ตอบ',
        'ปรับปรุงประสิทธิภาพเว็บไซต์ต่อเนื่อง พร้อมติดตาม Core Web Vitals จากผู้ใช้จริง',
        'เพิ่มข้อมูลพื้นที่จัดส่งสำหรับเมืองที่เราให้บริการบางแห่งในประเทศไทย',
      ],
      newsletterTitle: 'จดหมายข่าว',
      newsletterHint:
        'สนใจฟีเจอร์ถัดไป? รับอัปเดตเป็นครั้งคราว — ไม่สแปม ยกเลิกได้ตลอด',
      emailPlaceholder: 'อีเมลของคุณ',
      joinButton: 'สมัครรับ',
      newsletterSubscribing: 'กำลังสมัคร...',
      newsletterSuccess: 'สมัครสำเร็จแล้ว เราจะส่งเคล็ดลับและโปรโมชั่นให้คุณ',
      newsletterAlreadySubscribed: 'คุณสมัครรับข่าวสารอยู่แล้ว',
      newsletterError: 'เกิดข้อผิดพลาด กรุณาลองอีกครั้ง',
      newsletterInvalidEmail: 'กรุณากรอกอีเมลที่ถูกต้อง',
    },
    lookingAhead: {
      title: 'มองไปข้างหน้า',
      paragraphs: [
        'เราจะพัฒนาวิธีค้นหา ปรับแต่ง และส่งของขวัญให้ดีขึ้น พร้อมสร้างโอกาสที่ใช้งานได้จริงสำหรับร้านดอกไม้และผู้ผลิตงานฝีมือในท้องถิ่น',
        'ขอบคุณที่สนับสนุนสตาร์ทอัพอิสระจากเชียงใหม่ในขณะที่เราเติบโต',
      ],
    },
    dbdVerification: {
      title: 'DBD Verified (ประเทศไทย)',
      explanation:
        'Lanna Bloom เป็นธุรกิจออนไลน์ที่ผ่านการตรวจสอบ DBD (กรมพัฒนาธุรกิจการค้า กระทรวงพาณิชย์) การตรวจสอบนี้สนับสนุนความโปร่งใสและความเชื่อมั่นของลูกค้าสำหรับการสั่งซื้อออนไลน์',
      verifyLinkText: 'ตรวจสอบบน DBD (เปิดหน้าอย่างเป็นทางการ)',
    },
  },
};

export const aboutPageCopy: Record<Locale, AboutPageCopy> = {
  ...baseAboutPageCopy,
  ru: baseAboutPageCopy.en,
  'zh-sg': baseAboutPageCopy.en,
  'zh-hk': baseAboutPageCopy.en,
};
