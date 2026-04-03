/**
 * Bilingual copy for /[lang]/about
 */

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
  whyItMatters: { title: string; paragraphs: string[] };
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
  contact: {
    title: string;
    intro: AboutRichParagraph;
    websiteLabel: string;
    websiteUrl: string;
    websiteDisplay: string;
    partnerPortalLabel: string;
    partnerPortalLinkText: string;
    moreLinksTitle: string;
    moreLinks: AboutQuickLink[];
  };
};

export const aboutPageCopy: Record<'en' | 'th', AboutPageCopy> = {
  en: {
    metaTitle: 'About Lanna Bloom | Flower & gift delivery Chiang Mai',
    metaDescription:
      'Lanna Bloom is a Chiang Mai startup making flower and gift delivery easier to discover — supporting local florists, sellers, and makers.',
    h1: 'About Lanna Bloom',
    tagline: 'Flowers, gifts, and local creativity — made easier to discover in Chiang Mai',
    intro: [
      [
        { type: 'text', text: 'Lanna Bloom is a ' },
        { type: 'bold', text: 'growing local startup' },
        { type: 'text', text: ' based in ' },
        { type: 'bold', text: 'Chiang Mai' },
        { type: 'text', text: ', built to make ' },
        { type: 'bold', text: 'flower and gift delivery' },
        {
          type: 'text',
          text: ' simpler, more trustworthy, and more accessible for modern customers.',
        },
      ],
      [
        { type: 'text', text: 'We started with a ' },
        { type: 'bold', text: 'simple idea' },
        {
          type: 'text',
          text: ': many beautiful products and talented local sellers already exist, but too often they are hidden inside social media chats, scattered posts, or small pages that are difficult for new customers to find. We wanted to help change that.',
        },
      ],
      [
        {
          type: 'text',
          text: 'Lanna Bloom creates an easier window between customers and local sellers by bringing flowers, gifts, and handmade products into one clear online space — where people can browse, choose, and order with more confidence. ',
        },
        { type: 'bold', text: 'Start here' },
        { type: 'text', text: ': ' },
        { type: 'link', text: 'browse the shop', href: '/catalog' },
        { type: 'text', text: ', read our ' },
        { type: 'link', text: 'guides', href: '/info' },
        { type: 'text', text: ', or ' },
        { type: 'link', text: 'get in touch', href: '/contact' },
        { type: 'text', text: ' — we would love to help.' },
      ],
    ],
    quickLinks: {
      title: 'Explore Lanna Bloom',
      links: [
        { label: 'Shop — flowers & gifts', href: '/catalog' },
        { label: 'Guides & how to order', href: '/info' },
        { label: 'Delivery policy (Chiang Mai)', href: '/info/delivery-policy-chiang-mai' },
        { label: 'Contact us', href: '/contact' },
        { label: 'Become a partner', href: '/partner/how-it-works' },
        { label: 'Partner portal', href: '/partner/login' },
        { label: 'Customer reviews', href: '/reviews' },
      ],
    },
    whatWeBelieve: {
      title: 'What we believe',
      paragraphs: [
        'We believe local businesses deserve better visibility.',
        'Many florists, makers, and small creative sellers rely heavily on Facebook or messaging apps to sell their products. While that works to some extent, it can also limit growth. Customers may struggle to discover them, compare options, understand delivery areas, or trust the process.',
        'Our goal is to help local sellers move beyond social-only selling and become easier to discover through a more structured online experience.',
        'That means:',
      ],
      bullets: [
        'clearer product presentation',
        'better visibility for local sellers',
        'easier ordering for customers',
        'more trust for people buying from near or far',
      ],
    },
    supportingSellers: {
      title: 'Supporting local sellers and craftsmen',
      paragraphs: [
        'Lanna Bloom is not just about selling bouquets.',
        'We are building a platform that can support local florists, small sellers, and craftsmen by giving them access to a bigger market than only Facebook. We want to create more opportunities for talented local businesses to be seen by customers who are actively searching for quality gifts and flower delivery in Chiang Mai.',
        'Our long-term vision is to grow into a trusted local marketplace where customers can find not only flowers, but also carefully selected gifts and handcrafted products from local creators.',
        'We grow step by step, and we are building this carefully with real local needs in mind.',
      ],
    },
    startupGrowing: {
      title: 'A startup growing with purpose',
      paragraphs: [
        'Lanna Bloom is still growing.',
        'We are a local startup, and like many early-stage businesses, we grow with the resources we have. We work within a marketing budget, test what works, improve the platform gradually, and keep building as we can.',
        'This is not a giant company with endless funding. It is a real project being developed with care, learning from customers, partners, and real market conditions in Chiang Mai.',
        'That is also why every improvement matters to us.',
        'We pay attention to how people shop, how sellers present their products, and how we can make the experience better over time for both sides.',
      ],
    },
    whatWeAreBuilding: {
      title: 'What we are building',
      intro: 'Our focus is to create a platform that is:',
      bullets: [
        'easy for customers to use',
        'helpful for local sellers',
        'clear, trustworthy, and practical',
        'designed for real delivery and real local business growth',
      ],
      closing: [
        'We want customers to feel confident when ordering.',
        'We want sellers to feel that joining the platform helps them reach more people in a professional way.',
        'And we want local craftsmanship, creativity, and small business effort to have a better chance to grow online.',
      ],
    },
    whyItMatters: {
      title: 'Why it matters',
      paragraphs: [
        'Chiang Mai has many talented local florists and makers, but not all of them have the tools, time, or systems to build a strong online presence on their own.',
        'Lanna Bloom aims to help bridge that gap.',
        'By improving presentation, discoverability, and ordering flow, we hope to make it easier for customers to support local businesses — and easier for local businesses to grow.',
      ],
    },
    platformUpdates: {
      title: 'Platform updates',
      snippetIntro:
        'We post major platform milestones here when they land. Smaller changes happen continuously — if you want news, tips, and offers in your inbox, subscribe below.',
      lastUpdatedLabel: 'Last updated',
      lastUpdatedIso: '2026-04-03',
      lastUpdatedDisplay: 'April 2026',
      highlightsTitle: 'Major updates',
      highlights: [
        'New product categories to support more local sellers',
        'Clearer product browsing and presentation',
        'Partner tools and seller onboarding — ongoing',
        'More handmade and locally sourced gift products',
        'Website and checkout flow improvements — ongoing',
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
        'We are still at an early stage, but we believe in building something useful, local, and long-term.',
        'Lanna Bloom is growing step by step — with the goal of helping customers discover meaningful gifts more easily, while helping local sellers and craftsmen reach a wider audience in a better way.',
        'Thank you for supporting a local startup and being part of our journey.',
      ],
    },
    contact: {
      title: 'Contact',
      intro: [
        {
          type: 'text',
          text: 'To learn more, explore our platform, or follow our progress, visit our website below — or use the ',
        },
        { type: 'bold', text: 'helpful links' },
        { type: 'text', text: ' anytime.' },
      ],
      websiteLabel: 'Website:',
      websiteUrl: 'https://www.lannabloom.shop',
      websiteDisplay: 'LannaBloom.shop',
      partnerPortalLabel: 'Partner portal:',
      partnerPortalLinkText: 'Sign in',
      moreLinksTitle: 'On this site',
      moreLinks: [
        { label: 'Browse flowers & gifts', href: '/catalog' },
        { label: 'Guides', href: '/info' },
        { label: 'Contact', href: '/contact' },
      ],
    },
  },
  th: {
    metaTitle: 'เกี่ยวกับ Lanna Bloom | ส่งดอกไม้และของขวัญ เชียงใหม่',
    metaDescription:
      'Lanna Bloom เป็นสตาร์ทอัพในเชียงใหม่ที่ต้องการให้การค้นหาและสั่งดอกไม้/ของขวัญง่ายและน่าเชื่อถือขึ้น — สนับสนุนช่างดอกไม้ ผู้ขาย และช่างฝีมือท้องถิ่น',
    h1: 'เกี่ยวกับ Lanna Bloom',
    tagline: 'ดอกไม้ ของขวัญ และความคิดสร้างสรรค์จากท้องถิ่น — ค้นหาและเลือกในเชียงใหม่ง่ายขึ้น',
    intro: [
      [
        { type: 'text', text: 'Lanna Bloom เป็น ' },
        { type: 'bold', text: 'สตาร์ทอัพท้องถิ่นที่กำลังเติบโต' },
        { type: 'text', text: ' ใน ' },
        { type: 'bold', text: 'เชียงใหม่' },
        {
          type: 'text',
          text: ' สร้างขึ้นเพื่อให้ ',
        },
        { type: 'bold', text: 'การส่งดอกไม้และของขวัญ' },
        {
          type: 'text',
          text: ' ง่ายขึ้น น่าเชื่อถือขึ้น และเข้าถึงได้มากขึ้นสำหรับลูกค้ายุคใหม่',
        },
      ],
      [
        { type: 'text', text: 'เราเริ่มจาก ' },
        { type: 'bold', text: 'ความคิดง่ายๆ' },
        {
          type: 'text',
          text: ': สินค้าสวยและผู้ขายท้องถิ่นที่เก่งมีอยู่แล้ว แต่หลายครั้งกลับถูกซ่อนอยู่ในแชทโซเชียล โพสต์ที่กระจัดกระจาย หรือหน้าเพจเล็กๆ ที่ลูกค้าใหม่ค้นหาได้ยาก เราอยากมีส่วนช่วยเปลี่ยนแปลงเรื่องนั้น',
        },
      ],
      [
        {
          type: 'text',
          text: 'Lanna Bloom สร้างช่องทางที่ชัดเจนขึ้นระหว่างลูกค้ากับผู้ขายท้องถิ่น โดยรวมดอกไม้ ของขวัญ และสินค้าทำมือไว้ในพื้นที่ออนไลน์เดียว — ให้คุณเลือกดู เลือกซื้อ และสั่งได้ด้วยความมั่นใจมากขึ้น ',
        },
        { type: 'bold', text: 'เริ่มต้นที่นี่' },
        { type: 'text', text: ': ' },
        { type: 'link', text: 'เลือกดูร้านค้า', href: '/catalog' },
        { type: 'text', text: ' อ่าน ' },
        { type: 'link', text: 'คู่มือและบทความ', href: '/info' },
        { type: 'text', text: ' หรือ ' },
        { type: 'link', text: 'ติดต่อเรา', href: '/contact' },
        { type: 'text', text: ' — ยินดีช่วยเสมอ' },
      ],
    ],
    quickLinks: {
      title: 'สำรวจ Lanna Bloom',
      links: [
        { label: 'ร้านค้า — ดอกไม้และของขวัญ', href: '/catalog' },
        { label: 'คู่มือและวิธีสั่ง', href: '/info' },
        { label: 'นโยบายจัดส่ง (เชียงใหม่)', href: '/info/delivery-policy-chiang-mai' },
        { label: 'ติดต่อเรา', href: '/contact' },
        { label: 'สมัครเป็นพาร์ทเนอร์', href: '/partner/how-it-works' },
        { label: 'พอร์ทัลพาร์ทเนอร์ (เข้าสู่ระบบ)', href: '/partner/login' },
        { label: 'รีวิวจากลูกค้า', href: '/reviews' },
      ],
    },
    whatWeBelieve: {
      title: 'สิ่งที่เราเชื่อ',
      paragraphs: [
        'เราเชื่อว่าร้านธุรกิจท้องถิ่นสมควรได้รับการมองเห็นมากขึ้น',
        'หลายร้านดอกไม้ ผู้ทำของ และผู้ขายสร้างสรรค์รายย่อยพึ่งพา Facebook หรือแอปแชทในการขายอย่างหนัก ซึ่งก็ได้ผลบ้าง แต่ก็อาจจำกัดการเติบโต ลูกค้าอาจค้นหาไม่เจอ เปรียบเทียบตัวเลือกยาก พื้นที่จัดส่งไม่ชัด หรือไม่มั่นใจในขั้นตอน',
        'เป้าหมายของเราคือช่วยให้ผู้ขายท้องถิ่นก้าวข้ามการขายผ่านโซเชียลอย่างเดียว และถูกค้นพบได้ง่ายขึ้นผ่านประสบการณ์ออนไลน์ที่มีโครงสร้างชัดเจน',
        'นั่นหมายถึง:',
      ],
      bullets: [
        'การนำเสนอสินค้าที่ชัดเจนขึ้น',
        'การมองเห็นผู้ขายท้องถิ่นที่ดีขึ้น',
        'การสั่งซื้อที่ง่ายขึ้นสำหรับลูกค้า',
        'ความน่าเชื่อถือมากขึ้นสำหรับผู้ซื้อทั้งใกล้และไกล',
      ],
    },
    supportingSellers: {
      title: 'สนับสนุนผู้ขายและช่างฝีมือท้องถิ่น',
      paragraphs: [
        'Lanna Bloom ไม่ได้มีเพียงการขายช่อดอกไม้',
        'เรากำลังสร้างแพลตฟอร์มที่สนับสนุนช่างดอกไม้ท้องถิ่น ผู้ขายรายย่อย และช่างฝีมือ โดยเปิดตลาดที่กว้างกว่าการขายผ่าน Facebook เพียงอย่างเดียว เราต้องการสร้างโอกาสให้ธุรกิจท้องถิ่นที่มีความสามารถสูงได้ถูกมองเห็นโดยลูกค้าที่กำลังมองหาของขวัญคุณภาพและบริการส่งดอกไม้ในเชียงใหม่อย่างจริงจัง',
        'วิสัยทัศน์ระยะยาวของเราคือการเติบโตเป็นแหล่งรวมท้องถิ่นที่เชื่อถือได้ ที่ลูกค้าทั้งได้พบดอกไม้และของขวัญงานประดิษฐ์ที่คัดสรรจากผู้สร้างท้องถิ่น',
        'เราเติบโตทีละขั้นและพัฒนาอย่างรอบคอบด้วยความต้องการในท้องถิ่นจริง',
      ],
    },
    startupGrowing: {
      title: 'สตาร์ทอัพที่เติบโตด้วยความตั้งใจ',
      paragraphs: [
        'Lanna Bloom ยังคงเติบโตอยู่',
        'เราเป็นสตาร์ทอัพท้องถิ่น และเหมือนธุรกิจระยะเริ่มต้นหลายแห่ง เราเติบโตด้วยทรัพยากรที่มี เราทำงานภายใต้งบการตลาด ทดสอบสิ่งที่ได้ผล พัฒนาแพลตฟอร์มทีละน้อย และสร้างต่อตามที่ทำได้',
        'นี่ไม่ใช่องค์กรยักษ์ที่มีเงินทุนไม่จำกัด แต่เป็นโปรเจกต์จริงที่พัฒนาด้วยความใส่ใจ เรียนรู้จากลูกค้า พาร์ทเนอร์ และสภาพตลาดจริงในเชียงใหม่',
        'นั่นคือเหตุผลว่าทุกการปรับปรุงมีความหมายสำหรับเรา',
        'เราใส่ใจว่าผู้คนช้อปอย่างไร ผู้ขายนำเสนอสินค้าอย่างไร และเราจะทำให้ประสบการณ์ดีขึ้นเรื่อยๆ สำหรับทั้งสองฝ่ายได้อย่างไร',
      ],
    },
    whatWeAreBuilding: {
      title: 'สิ่งที่เรากำลังสร้าง',
      intro: 'โฟกัสของเราคือแพลตฟอร์มที่:',
      bullets: [
        'ใช้งานง่ายสำหรับลูกค้า',
        'เป็นประโยชน์ต่อผู้ขายท้องถิ่น',
        'ชัดเจน น่าเชื่อถือ และใช้งานได้จริง',
        'ออกแบบมาสำหรับการจัดส่งจริงและการเติบโตของธุรกิจท้องถิ่นจริง',
      ],
      closing: [
        'เราต้องการให้ลูกค้ามั่นใจเมื่อสั่งซื้อ',
        'เราต้องการให้ผู้ขายรู้สึกว่าการเข้าร่วมแพลตฟอร์มช่วยให้เข้าถึงคนได้มากขึ้นในแบบมืออาชีพ',
        'และเราต้องการให้งานฝีมือ ความคิดสร้างสรรค์ และความพยายามของธุรกิจขนาดเล็กมีโอกาสเติบโตออนไลน์ได้ดีขึ้น',
      ],
    },
    whyItMatters: {
      title: 'ทำไมถึงสำคัญ',
      paragraphs: [
        'เชียงใหม่มีช่างดอกไม้และผู้ทำงานมือมากมาย แต่ไม่ใช่ทุกคนที่จะมีเครื่องมือ เวลา หรือระบบเพื่อสร้างตัวตนออนไลน์ที่แข็งแรงด้วยตนเอง',
        'Lanna Bloom ตั้งใจช่วยเชื่อมช่องว่างนั้น',
        'ด้วยการปรับปรุงการนำเสนอ การค้นพบ และขั้นตอนการสั่งซื้อ เราหวังว่าจะทำให้ลูกค้าสนับสนุนธุรกิจท้องถิ่นได้ง่ายขึ้น — และธุรกิจท้องถิ่นเติบโตได้ง่ายขึ้น',
      ],
    },
    platformUpdates: {
      title: 'อัปเดตแพลตฟอร์ม',
      snippetIntro:
        'เราโพสต์เหตุการณ์สำคัญของแพลตฟอร์มที่นี่เมื่อมีการปล่อยจริง ส่วนการปรับย่อยเกิดขึ้นตลอด — ถ้าต้องการข่าว เคล็ดลับ และโปรในอีเมล สมัครรับจดหมายด้านล่าง',
      lastUpdatedLabel: 'อัปเดตล่าสุด',
      lastUpdatedIso: '2026-04-03',
      lastUpdatedDisplay: 'เมษายน 2026',
      highlightsTitle: 'อัปเดตสำคัญ',
      highlights: [
        'หมวดสินค้าใหม่เพื่อรองรับผู้ขายท้องถิ่นมากขึ้น',
        'การเลือกดูและนำเสนอสินค้าที่ชัดเจนขึ้น',
        'เครื่องมือพาร์ทเนอร์และการออนบอร์ดผู้ขาย — ดำเนินการต่อ',
        'ของขวัญงานมือและสินค้าท้องถิ่นมากขึ้น',
        'ปรับปรุงเว็บไซต์และขั้นตอนสั่งซื้อ — ดำเนินการต่อ',
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
        'เรายังอยู่ในช่วงเริ่มต้น แต่เราเชื่อในการสร้างสิ่งที่เป็นประโยชน์ ท้องถิ่น และยั่งยืน',
        'Lanna Bloom กำลังเติบโตทีละขั้น — ด้วยเป้าหมายช่วยให้ลูกค้าค้นพบของขวัญที่มีความหมายได้ง่ายขึ้น — และช่วยให้ผู้ขายท้องถิ่นกับช่างฝีมือเข้าถึงกลุ่มคนได้กว้างขึ้นในแบบที่ดีขึ้น',
        'ขอบคุณที่สนับสนุนสตาร์ทอัพท้องถิ่นและเป็นส่วนหนึ่งของการเดินทางของเรา',
      ],
    },
    contact: {
      title: 'ติดต่อ',
      intro: [
        {
          type: 'text',
          text: 'หากต้องการเรียนรู้เพิ่มเติม สำรวจแพลตฟอร์ม หรือติดตามความคืบหน้า แวะที่เว็บไซต์ด้านล่าง — หรือใช้ ',
        },
        { type: 'bold', text: 'ลิงก์ที่เป็นประโยชน์' },
        { type: 'text', text: ' เหล่านี้ได้ตลอดเวลา' },
      ],
      websiteLabel: 'เว็บไซต์:',
      websiteUrl: 'https://www.lannabloom.shop',
      websiteDisplay: 'LannaBloom.shop',
      partnerPortalLabel: 'พอร์ทัลพาร์ทเนอร์:',
      partnerPortalLinkText: 'เข้าสู่ระบบ',
      moreLinksTitle: 'ในเว็บไซต์นี้',
      moreLinks: [
        { label: 'เลือกดูดอกไม้และของขวัญ', href: '/catalog' },
        { label: 'คู่มือและบทความ', href: '/info' },
        { label: 'ติดต่อ', href: '/contact' },
      ],
    },
  },
};
