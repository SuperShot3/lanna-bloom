/**
 * Bilingual copy for /partner/how-it-works — imported into lib/i18n.ts.
 */

export type ProductCategoryRow = {
  icon: string;
  category: string;
  examples: string;
};

export type PartnerHowItWorksCopy = {
  pageTitle: string;
  metaDescription: string;
  h1: string;
  introParagraphs: string[];
  goalNote: string;
  legalNote: string;
  commissionNote: string;

  /* ── NEW: Why Partner ── */
  whyPartnerTitle: string;
  whyPartnerIntro: string;
  whyPartnerList: string[];
  whyPartnerClosing: string;

  /* ── NEW: Simple Onboarding ── */
  onboardingTitle: string;
  onboardingIntro: string;
  onboardingSubIntro: string;
  onboardingList: string[];
  onboardingSupportNote: string;

  /* ── NEW: Basic Listing Requirements ── */
  listingReqTitle: string;
  listingReqIntro: string;
  listingReqList: string[];
  listingReqNote: string;

  /* ── NEW: Product Suitability for Delivery ── */
  deliverySuitabilityTitle: string;
  deliverySuitabilityParagraphs: string[];

  /* ── NEW: Product Image Quality ── */
  imageQualityTitle: string;
  imageQualityIntro: string;
  imageQualitySubIntro: string;
  imageQualityNoteLabel: string;
  imageQualityList: string[];
  imageQualityTip: string;

  /* ── NEW: Support for Early Partners ── */
  earlyPartnersTitle: string;
  earlyPartnersIntro: string;
  earlyPartnersList: string[];
  earlyPartnersClosing: string;

  /* ── Existing: Product categories table ── */
  productCategoriesTitle: string;
  productCategoriesIntro: string;
  productCategoriesCatHeader: string;
  productCategoriesExHeader: string;
  productCategoriesTable: ProductCategoryRow[];

  /* ── Existing: With flowers ── */
  withFlowersTitle: string;
  withFlowersIntro: string;
  withFlowersList: string[];

  /* ── Existing: Seller types ── */
  sellerTypesTitle: string;
  sellerTypesIntro: string;
  sellerTypesList: string[];

  /* ── Existing + NEW additions: Who can partner ── */
  whoCanTitle: string;
  whoCanParagraphs: string[];
  whoCanBulletIntro: string;
  whoCanList: string[];
  whoCanCallout: string;

  /* ── NEW: Apply CTA section ── */
  applyCtaTitle: string;
  applyCtaIntro: string;
  applyCtaPortalLabel: string;
  applyCtaClosing: string;

  footerNote: string;
  ctaApply: string;
  ctaEmail: string;
  emailDisplay: string;
  emailSubject: string;
  navLabel: string;
  loginFooterHint: string;
  applyHeroLink: string;
};

/* ════════════════════════════════════════════════════════
   ENGLISH
════════════════════════════════════════════════════════ */
export const partnerHowItWorksEn: PartnerHowItWorksCopy = {
  pageTitle: 'Partner with Lanna Bloom — how it works',
  metaDescription:
    'Sell gifts and complementary products with Lanna Bloom in Chiang Mai. How partnering works, product ideas, and how to apply.',
  h1: 'Partner With Lanna Bloom 🌸',

  introParagraphs: [
    'Lanna Bloom welcomes partners who want to sell products online through our website and grow through a structured partner platform.',
    'We are especially interested in products that work well for gifting, celebrations, special occasions, and flower add-ons in Chiang Mai and Thailand.',
    'This can include items such as toys, gift sets, candles, sweets, wellness items, handmade products, baby gifts, and other thoughtful products suitable for gifting.',
  ],
  goalNote:
    'Our goal is to build a clear and professional online sales channel where Lanna Bloom focuses on marketing, promotion, and bringing customers to the platform, while partners submit and manage their store and product information through the partner portal.',
  legalNote:
    'We welcome quality products that are suitable for online sales and gifting. Illegal, unsafe, or prohibited items cannot be sold.',
  commissionNote: 'Commission and cooperation terms will be discussed after approval.',

  /* ── Why Partner ── */
  whyPartnerTitle: '✨ Why Partner With Lanna Bloom',
  whyPartnerIntro:
    'Lanna Bloom is focused on helping quality local sellers reach customers through a more structured online gifting platform.',
  whyPartnerList: [
    'A focused platform for gifts, flowers, and complementary products',
    'Additional online visibility through Lanna Bloom marketing and promotion',
    'A structured way to present products more professionally',
    'An opportunity to reach customers without building a full standalone online store',
    'A partner portal that helps make onboarding and product submission more organized',
  ],
  whyPartnerClosing:
    'We aim to create a curated and professional marketplace experience for both customers and partners.',

  /* ── Simple Onboarding ── */
  onboardingTitle: '🚀 Simple Onboarding Process',
  onboardingIntro:
    'We want the onboarding process to feel clear and manageable for our partners.',
  onboardingSubIntro:
    'To keep cooperation smooth and organized, partners are asked to use the partner portal as the main channel for joining and submitting product information.',
  onboardingList: [
    'Submitting store details through the portal',
    'Sharing business and contact information',
    'Uploading initial product information for review',
    'Receiving approval before products go live',
  ],
  onboardingSupportNote:
    'Basic support may be available during onboarding when needed, but the partner portal is the main system for product submission and cooperation.',

  /* ── Basic Listing Requirements ── */
  listingReqTitle: '✅ Basic Listing Requirements',
  listingReqIntro:
    'To help maintain a strong customer experience on the platform, products should meet some basic requirements:',
  listingReqList: [
    'The product should be suitable for online sales and delivery',
    'The price point should make sense within a delivery-based marketplace',
    'The product should offer clear value as a gift, add-on, or curated item',
    'Images should be clear, sharp, and suitable for professional online display',
  ],
  listingReqNote:
    'Lanna Bloom may decline products or listings that are not commercially suitable for delivery, or that do not meet basic presentation standards.',

  /* ── Product Suitability for Delivery ── */
  deliverySuitabilityTitle: '📦 Product Suitability for Delivery',
  deliverySuitabilityParagraphs: [
    'Because Lanna Bloom operates through online orders and delivery, products should be suitable for this type of sales model.',
    'In general, very low-priced items may not be a good fit for the platform if delivery costs make the product commercially impractical. For this reason, we may not accept items that are too low in value to work well within a gifting and delivery marketplace.',
    'We are especially interested in products that offer clear customer value and remain suitable for delivery as part of a gift order, add-on item, or curated set.',
  ],

  /* ── Product Image Quality ── */
  imageQualityTitle: '🖼️ Product Image Quality',
  imageQualityIntro: 'Good presentation is very important on the Lanna Bloom platform.',
  imageQualitySubIntro:
    'To keep the marketplace professional and attractive for customers, partners are expected to provide clear, high-quality product images.',
  imageQualityNoteLabel: 'Please note:',
  imageQualityList: [
    'Low-resolution images may not be accepted',
    'Dark, blurry, poorly cropped, or unclear photos may be rejected',
    'Product images should represent the item clearly and professionally',
    'Images should be suitable for online display and customer trust',
  ],
  imageQualityTip:
    'We recommend using bright, sharp, well-composed images with a clean background whenever possible.',

  /* ── Support for Early Partners ── */
  earlyPartnersTitle: '🌟 Support for Early Partners',
  earlyPartnersIntro:
    'As we continue growing the marketplace, we may provide selected early partners with additional visibility opportunities on the platform.',
  earlyPartnersList: [
    'Better visibility for selected new listings',
    'Promotional support through Lanna Bloom marketing channels',
    'Opportunities to be featured as part of curated gifting collections',
  ],
  earlyPartnersClosing:
    'Our goal is to help quality partners grow together with the platform.',

  /* ── Product categories table (updated rows) ── */
  productCategoriesTitle: '🎁 Product Ideas We Welcome',
  productCategoriesIntro:
    'We welcome a wide range of products that can be sold online as gifts or as complementary items with flowers.',
  productCategoriesCatHeader: 'Category',
  productCategoriesExHeader: 'Examples',
  productCategoriesTable: [
    { icon: '🧸', category: 'Toys & Plush', examples: 'Teddy bears, plush toys' },
    { icon: '🍓', category: 'Food & Sweets', examples: 'Fruit baskets, chocolates, sweets' },
    { icon: '🎀', category: 'Premium Sets', examples: 'Gift baskets, bird\'s nest sets, Salaya sets, wellness gift sets' },
    { icon: '🕯️', category: 'Wellness', examples: 'Candles, soaps, bath sets, essential oils, small perfumes' },
    { icon: '👜', category: 'Fashion & Accessories', examples: 'Handmade bags, scarves, socks, small clothing items, jewelry, hair accessories' },
    { icon: '👶', category: 'Baby & Family', examples: 'Baby gift items, towels, small blankets' },
    { icon: '☕', category: 'Home & Lifestyle', examples: 'Mugs, home decor, ceramic items, mini plants, dried flowers' },
    { icon: '📖', category: 'Stationery', examples: 'Notebooks, journals, greeting cards, gift cards, keychains' },
    { icon: '🌿', category: 'Seasonal', examples: 'Tea or coffee gift packs, wellness sets, seasonal or holiday gifts' },
    { icon: '💝', category: 'Occasion Sets', examples: 'Romantic sets, anniversary boxes, birthday add-ons, get well soon sets' },
  ],

  /* ── With flowers ── */
  withFlowersTitle: '💐 Items That Work Especially Well With Flowers',
  withFlowersIntro:
    'These products are especially suitable as add-ons or gift combinations with flowers:',
  withFlowersList: [
    '🧸 Teddy bears',
    '🎁 Gift cards',
    '🕯️ Candles',
    '💌 Greeting cards',
    '🌿 Scented items & spa sets',
    '🛁 Towels',
    '👶 Baby gifts',
    '💝 Romantic & anniversary gift sets',
    '🎂 Birthday add-ons',
    '💊 Get well soon sets',
    '🍓 Fruit baskets',
    '🌱 Bird\'s nest & wellness baskets',
  ],

  /* ── Seller types ── */
  sellerTypesTitle: '🏙️ Types of Local Sellers We May Work With in Chiang Mai',
  sellerTypesIntro: 'We may look for partners such as:',
  sellerTypesList: [
    'Handmade craft makers',
    'Souvenir shops',
    'Candle & soap makers',
    'Ceramic workshops',
    'Clothing or fabric shops',
    'Baby product sellers',
    'Gift shop owners',
    'Tea brands',
    'Wellness product makers',
    'Artisan home decor sellers',
    'Fruit basket & premium gift basket suppliers',
    'Bird\'s nest product sellers',
    'Health and wellness gift suppliers',
  ],

  /* ── Who can partner (existing + new additions) ── */
  whoCanTitle: '🤝 Who Can Partner With Us',
  whoCanParagraphs: [
    'We welcome partners with products that can be sold online as gifts or as complementary items with flowers — including toys, chocolates, candles, towels, socks, small clothing items, gift sets, handmade products, sweets, and other suitable gift items.',
  ],
  whoCanBulletIntro: 'This includes products such as:',
  whoCanList: [
    'Toys and plush items',
    'Chocolates and sweets',
    'Candles and scented products',
    'Towels and baby gifts',
    'Socks and small clothing items',
    'Gift sets and handmade products',
    'Occasion-based gift items',
    'Wellness and premium add-on products',
  ],
  whoCanCallout:
    '✅ We welcome legal, safe, and quality products only.\nCommission details will be discussed after approval.',

  /* ── Apply CTA section ── */
  applyCtaTitle: '🌺 Interested in Becoming a Partner?',
  applyCtaIntro:
    'If you believe your products are a good fit for the Lanna Bloom marketplace, we would be happy to hear from you.',
  applyCtaPortalLabel: 'Please apply through our partner portal:',
  applyCtaClosing: "Let's grow together.",

  footerNote: 'Interested in becoming a partner? We\'d love to hear from you. 🌺',
  ctaApply: 'Apply online',
  ctaEmail: 'Email us',
  emailDisplay: 'support@lannabloom.shop',
  emailSubject: 'Partner inquiry — Lanna Bloom',
  navLabel: 'How it works',
  loginFooterHint: 'New to the partner program? Read how partnering works.',
  applyHeroLink: 'How partnering works',
};

/* ════════════════════════════════════════════════════════
   THAI
════════════════════════════════════════════════════════ */
export const partnerHowItWorksTh: PartnerHowItWorksCopy = {
  pageTitle: 'ร่วมเป็น Partner กับ Lanna Bloom — วิธีการทำงาน',
  metaDescription:
    'ขายของขวัญและสินค้าเสริมกับ Lanna Bloom ในเชียงใหม่ แนวทางร่วมงาน ไอเดียสินค้า และวิธีสมัคร',
  h1: 'ร่วมเป็น Partner กับ Lanna Bloom 🌸',

  introParagraphs: [
    'Lanna Bloom ต้อนรับพาร์ทเนอร์ที่ต้องการขายสินค้าออนไลน์ผ่านเว็บไซต์ของเรา และเติบโตผ่านแพลตฟอร์มพาร์ทเนอร์ที่มีระบบ',
    'เราสนใจเป็นพิเศษในสินค้าที่เหมาะสำหรับการมอบเป็นของขวัญ การเฉลิมฉลอง โอกาสพิเศษ และสินค้าเสริมดอกไม้ในเชียงใหม่และทั่วไทย',
    'ตัวอย่างเช่น ของเล่น ชุดของขวัญ เทียนหอม ขนม สินค้าเพื่อสุขภาพ สินค้าทำมือ ของขวัญเด็ก และสินค้าอื่น ๆ ที่เหมาะกับการมอบเป็นของขวัญ',
  ],
  goalNote:
    'เป้าหมายของเราคือการสร้างช่องทางขายออนไลน์ที่ชัดเจนและเป็นมืออาชีพ โดย Lanna Bloom โฟกัสการตลาด การโปรโมต และการพาลูกค้ามายังแพลตฟอร์ม ขณะที่พาร์ทเนอร์ส่งและจัดการข้อมูลร้านและสินค้าผ่านพอร์ทัลพาร์ทเนอร์',
  legalNote:
    'เรายินดีต้อนรับสินค้าคุณภาพที่เหมาะกับการขายออนไลน์และของขวัญ สินค้าผิดกฎหมาย ไม่ปลอดภัย หรือสินค้าต้องห้าม ไม่สามารถจำหน่ายได้',
  commissionNote: 'อัตราค่าคอมมิชชันและเงื่อนไขการร่วมมือจะหารือหลังการอนุมัติ',

  /* ── Why Partner ── */
  whyPartnerTitle: '✨ ทำไมต้องร่วมงานกับ Lanna Bloom',
  whyPartnerIntro:
    'Lanna Bloom มุ่งเน้นช่วยให้ผู้ขายในท้องถิ่นที่มีคุณภาพเข้าถึงลูกค้าผ่านแพลตฟอร์มของขวัญออนไลน์ที่มีระบบมากขึ้น',
  whyPartnerList: [
    'แพลตฟอร์มที่เน้นของขวัญ ดอกไม้ และสินค้าเสริมโดยเฉพาะ',
    'เพิ่มการมองเห็นออนไลน์ผ่านการตลาดและโปรโมตของ Lanna Bloom',
    'วิธีนำเสนอสินค้าอย่างเป็นมืออาชีพมากขึ้น',
    'โอกาสเข้าถึงลูกค้าโดยไม่ต้องสร้างร้านออนไลน์เต็มรูปแบบด้วยตัวเอง',
    'พอร์ทัลพาร์ทเนอร์ที่ช่วยให้การเริ่มต้นและการส่งข้อมูลสินค้าเป็นระบบมากขึ้น',
  ],
  whyPartnerClosing:
    'เรามุ่งสร้างประสบการณ์ตลาดที่คัดสรรและเป็นมืออาชีพทั้งสำหรับลูกค้าและพาร์ทเนอร์',

  /* ── Simple Onboarding ── */
  onboardingTitle: '🚀 กระบวนการเริ่มต้นที่เรียบง่าย',
  onboardingIntro:
    'เราต้องการให้กระบวนการเริ่มต้นรู้สึกชัดเจนและจัดการได้สำหรับพาร์ทเนอร์',
  onboardingSubIntro:
    'เพื่อให้การร่วมงานราบรื่นและเป็นระบบ พาร์ทเนอร์จะถูกขอให้ใช้พอร์ทัลพาร์ทเนอร์เป็นช่องทางหลักในการเข้าร่วมและส่งข้อมูลสินค้า',
  onboardingList: [
    'ส่งรายละเอียดร้านผ่านพอร์ทัล',
    'แชร์ข้อมูลธุรกิจและข้อมูลผู้ติดต่อ',
    'อัปโหลดข้อมูลสินค้าเบื้องต้นเพื่อรับการตรวจสอบ',
    'รับการอนุมัติก่อนที่สินค้าจะแสดงบนแพลตฟอร์ม',
  ],
  onboardingSupportNote:
    'อาจมีการสนับสนุนเบื้องต้นระหว่างการเริ่มต้นเมื่อจำเป็น แต่พอร์ทัลพาร์ทเนอร์คือระบบหลักสำหรับการส่งสินค้าและการร่วมงาน',

  /* ── Basic Listing Requirements ── */
  listingReqTitle: '✅ ข้อกำหนดพื้นฐานสำหรับสินค้า',
  listingReqIntro:
    'เพื่อรักษาประสบการณ์ลูกค้าที่ดีบนแพลตฟอร์ม สินค้าควรผ่านข้อกำหนดพื้นฐานบางประการ:',
  listingReqList: [
    'สินค้าควรเหมาะสำหรับการขายออนไลน์และการจัดส่ง',
    'ราคาควรสมเหตุสมผลในตลาดที่ใช้บริการจัดส่ง',
    'สินค้าควรมีคุณค่าที่ชัดเจนในฐานะของขวัญ สินค้าเสริม หรือไอเทมที่คัดสรรแล้ว',
    'ภาพควรชัดเจน คมชัด และเหมาะสำหรับการแสดงออนไลน์อย่างมืออาชีพ',
  ],
  listingReqNote:
    'Lanna Bloom อาจปฏิเสธสินค้าหรือรายการที่ไม่เหมาะสมในเชิงการค้าสำหรับการจัดส่ง หรือที่ไม่ผ่านมาตรฐานการนำเสนอขั้นพื้นฐาน',

  /* ── Product Suitability for Delivery ── */
  deliverySuitabilityTitle: '📦 ความเหมาะสมของสินค้าสำหรับการจัดส่ง',
  deliverySuitabilityParagraphs: [
    'เนื่องจาก Lanna Bloom ดำเนินการผ่านการสั่งซื้อออนไลน์และการจัดส่ง สินค้าควรเหมาะสำหรับรูปแบบการขายนี้',
    'โดยทั่วไป สินค้าราคาต่ำมากอาจไม่เหมาะกับแพลตฟอร์มหากค่าจัดส่งทำให้สินค้าไม่คุ้มค่าในเชิงการค้า ด้วยเหตุนี้ เราอาจไม่รับสินค้าที่มีมูลค่าต่ำเกินไปสำหรับตลาดของขวัญและการจัดส่ง',
    'เราสนใจเป็นพิเศษในสินค้าที่มอบคุณค่าที่ชัดเจนแก่ลูกค้าและเหมาะสำหรับการจัดส่งในฐานะส่วนหนึ่งของของขวัญ สินค้าเสริม หรือชุดที่คัดสรรแล้ว',
  ],

  /* ── Product Image Quality ── */
  imageQualityTitle: '🖼️ คุณภาพภาพสินค้า',
  imageQualityIntro: 'การนำเสนอที่ดีมีความสำคัญมากบนแพลตฟอร์ม Lanna Bloom',
  imageQualitySubIntro:
    'เพื่อให้ตลาดดูเป็นมืออาชีพและน่าสนใจสำหรับลูกค้า พาร์ทเนอร์ควรจัดหาภาพสินค้าที่ชัดเจนและมีคุณภาพสูง',
  imageQualityNoteLabel: 'กรุณาทราบ:',
  imageQualityList: [
    'ภาพความละเอียดต่ำอาจไม่ได้รับการยอมรับ',
    'ภาพมืด เบลอ ตัดขอบไม่ดี หรือไม่ชัดเจนอาจถูกปฏิเสธ',
    'ภาพสินค้าควรแสดงสินค้าอย่างชัดเจนและเป็นมืออาชีพ',
    'ภาพควรเหมาะสำหรับการแสดงออนไลน์และความเชื่อมั่นของลูกค้า',
  ],
  imageQualityTip:
    'เราแนะนำให้ใช้ภาพที่สว่าง คมชัด จัดองค์ประกอบดี พร้อมพื้นหลังสะอาดเมื่อเป็นไปได้',

  /* ── Support for Early Partners ── */
  earlyPartnersTitle: '🌟 การสนับสนุนสำหรับพาร์ทเนอร์แรก ๆ',
  earlyPartnersIntro:
    'เมื่อเราเติบโตในตลาดต่อไป เราอาจให้พาร์ทเนอร์แรก ๆ ที่คัดเลือกมาด้วยโอกาสการมองเห็นเพิ่มเติมบนแพลตฟอร์ม',
  earlyPartnersList: [
    'การมองเห็นที่ดีขึ้นสำหรับรายการสินค้าใหม่ที่คัดเลือก',
    'การสนับสนุนโปรโมตผ่านช่องทางการตลาดของ Lanna Bloom',
    'โอกาสเป็นส่วนหนึ่งของคอลเลกชันของขวัญที่คัดสรรแล้ว',
  ],
  earlyPartnersClosing:
    'เป้าหมายของเราคือช่วยให้พาร์ทเนอร์คุณภาพเติบโตไปพร้อมกับแพลตฟอร์ม',

  /* ── Product categories table (updated rows) ── */
  productCategoriesTitle: '🎁 ไอเดียสินค้าที่เราต้อนรับ',
  productCategoriesIntro:
    'เรายินดีต้อนรับสินค้าหลากหลายประเภทที่สามารถจำหน่ายออนไลน์เป็นของขวัญ หรือเป็นสินค้าเสริมคู่กับดอกไม้ได้',
  productCategoriesCatHeader: 'หมวดหมู่',
  productCategoriesExHeader: 'ตัวอย่าง',
  productCategoriesTable: [
    { icon: '🧸', category: 'ของเล่นและตุ๊กตา', examples: 'ตุ๊กตาหมี ของเล่นตุ๊กตา' },
    { icon: '🍓', category: 'อาหารและขนม', examples: 'ตะกร้าผลไม้ ช็อกโกแลต ขนมหวาน' },
    { icon: '🎀', category: 'ชุดพรีเมียม', examples: 'ตะกร้าของขวัญ ชุดของขวัญรังนก ชุดศาลายา ชุดของขวัญเพื่อสุขภาพ' },
    { icon: '🕯️', category: 'เพื่อสุขภาพและผ่อนคลาย', examples: 'เทียนหอม สบู่ ชุดอาบน้ำ น้ำมันหอมระเหย น้ำหอมขนาดเล็ก' },
    { icon: '👜', category: 'แฟชั่นและเครื่องประดับ', examples: 'กระเป๋าทำมือ ผ้าพันคอ ถุงเท้า เสื้อผ้าขนาดเล็ก เครื่องประดับ เครื่องประดับผม' },
    { icon: '👶', category: 'เด็กและครอบครัว', examples: 'ของขวัญเด็ก ผ้าขนหนู ผ้าห่มขนาดเล็ก' },
    { icon: '☕', category: 'บ้านและไลฟ์สไตล์', examples: 'แก้ว ของตกแต่งบ้าน เซรามิก ต้นไม้ขนาดเล็ก ดอกไม้แห้ง' },
    { icon: '📖', category: 'เครื่องเขียน', examples: 'สมุด สมุดบันทึก การ์ดอวยพร บัตรของขวัญ พวงกุญแจ' },
    { icon: '🌿', category: 'ตามฤดูกาล', examples: 'ชุดของขวัญชาหรือกาแฟ ชุดสุขภาพ ของขวัญตามเทศกาล' },
    { icon: '💝', category: 'ชุดตามโอกาส', examples: 'ชุดโรแมนติก กล่องวันครบรอบ ของเสริมวันเกิด ชุดอวยหายป่วย' },
  ],

  /* ── With flowers ── */
  withFlowersTitle: '💐 สินค้าที่เข้ากับดอกไม้ได้ดีเป็นพิเศษ',
  withFlowersIntro:
    'สินค้าเหล่านี้เหมาะเป็นของเสริมหรือชุดของขวัญคู่กับดอกไม้โดยเฉพาะ:',
  withFlowersList: [
    '🧸 ตุ๊กตาหมี',
    '🎁 บัตรของขวัญ',
    '🕯️ เทียนหอม',
    '💌 การ์ดอวยพร',
    '🌿 สินค้าหอมกลิ่นและชุดสปา',
    '🛁 ผ้าขนหนู',
    '👶 ของขวัญเด็ก',
    '💝 ชุดของขวัญโรแมนติกและวันครบรอบ',
    '🎂 ของเสริมวันเกิด',
    '💊 ชุดอวยหายป่วย',
    '🍓 ตะกร้าผลไม้',
    '🌱 ชุดรังนกและตะกร้าสุขภาพ',
  ],

  /* ── Seller types ── */
  sellerTypesTitle: '🏙️ ประเภทร้านหรือผู้ผลิตในเชียงใหม่ที่เราอาจร่วมงานด้วย',
  sellerTypesIntro: 'เราอาจมองหาพาร์ทเนอร์ เช่น:',
  sellerTypesList: [
    'ช่างฝีมืองานคราฟต์',
    'ร้านของที่ระลึก',
    'ผู้ทำเทียนและสบู่',
    'เวิร์กช็อปเซรามิก',
    'ร้านเสื้อผ้าหรือผ้า',
    'ร้านสินค้าเด็ก',
    'เจ้าของร้านของขวัญ',
    'แบรนด์ชา',
    'ผู้ทำสินค้าเพื่อสุขภาพ',
    'ร้านของตกแต่งบ้านแฮนด์เมด',
    'ผู้จัดหาตะกร้าผลไม้และตะกร้าของขวัญพรีเมียม',
    'ผู้จำหน่ายสินค้ารังนก',
    'ผู้จัดหาของขวัญเพื่อสุขภาพ',
  ],

  /* ── Who can partner (existing + new additions) ── */
  whoCanTitle: '🤝 ใครสามารถร่วมเป็นพาร์ทเนอร์กับเรา',
  whoCanParagraphs: [
    'เรายินดีต้อนรับพาร์ทเนอร์ที่มีสินค้าสามารถขายออนไลน์เป็นของขวัญ หรือเป็นสินค้าเสริมกับดอกไม้ได้',
  ],
  whoCanBulletIntro: 'ซึ่งรวมถึงสินค้า เช่น:',
  whoCanList: [
    'ของเล่นและตุ๊กตา',
    'ช็อกโกแลตและขนมหวาน',
    'เทียนและสินค้าหอมกลิ่น',
    'ผ้าขนหนูและของขวัญเด็ก',
    'ถุงเท้าและเสื้อผ้าขนาดเล็ก',
    'ชุดของขวัญและสินค้าทำมือ',
    'สินค้าของขวัญตามโอกาส',
    'สินค้าเพื่อสุขภาพและสินค้าเสริมพรีเมียม',
  ],
  whoCanCallout:
    '✅ เรารับเฉพาะสินค้าที่ถูกกฎหมาย ปลอดภัย และมีคุณภาพเท่านั้น\nรายละเอียดค่าคอมมิชันจะหารือหลังการอนุมัติ',

  /* ── Apply CTA section ── */
  applyCtaTitle: '🌺 สนใจเป็นพาร์ทเนอร์กับเราไหม?',
  applyCtaIntro:
    'หากคุณเชื่อว่าสินค้าของคุณเหมาะกับตลาด Lanna Bloom เรายินดีได้ยินจากคุณ',
  applyCtaPortalLabel: 'กรุณาสมัครผ่านพอร์ทัลพาร์ทเนอร์:',
  applyCtaClosing: 'เติบโตไปด้วยกัน',

  footerNote: 'สนใจเป็นพาร์ทเนอร์กับเรา? เรายินดีได้ยินจากคุณเสมอ 🌺',
  ctaApply: 'สมัครออนไลน์',
  ctaEmail: 'ส่งอีเมลถึงเรา',
  emailDisplay: 'support@lannabloom.shop',
  emailSubject: 'สอบถาม Partner — Lanna Bloom',
  navLabel: 'วิธีร่วมงาน',
  loginFooterHint: 'เพิ่งเริ่มใช้พอร์ทัลพาร์ทเนอร์? อ่านวิธีร่วมงานกับเรา',
  applyHeroLink: 'วิธีร่วมงานกับ Lanna Bloom',
};
