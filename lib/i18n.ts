export type Locale = 'en' | 'th';

export const locales: Locale[] = ['en', 'th'];
export const defaultLocale: Locale = 'en';

export function isValidLocale(locale: string): locale is Locale {
  return locales.includes(locale as Locale);
}

export const translations = {
  en: {
    nav: {
      home: 'Home',
      catalog: 'Catalog',
    },
    hero: {
      headline: 'Fresh flowers delivered with care',
      subline: 'Choose the perfect bouquet for any occasion',
      cta: 'Choose a bouquet',
    },
    categories: {
      all: 'All bouquets',
      roses: 'Roses',
      mixed: 'Mixed bouquets',
      mono: 'Mono bouquets',
      inBox: 'Flowers in a box',
      romantic: 'Romantic',
      birthday: 'Birthday',
      sympathy: 'Sympathy',
    },
    catalog: {
      title: 'Our bouquets',
      from: 'from',
      viewDetails: 'View details',
    },
    product: {
      composition: 'Composition',
      size: 'Size',
      orderVia: 'Order via',
      orderLine: 'Order via LINE',
      orderWhatsApp: 'Order via WhatsApp',
      orderTelegram: 'Order via Telegram',
      orderFacebook: 'Order via Facebook',
      messageTemplate: 'Hello! I want to order bouquet {name}, size {size}',
    },
    messenger: {
      line: 'LINE',
      whatsapp: 'WhatsApp',
      telegram: 'Telegram',
      facebook: 'Facebook',
    },
  },
  th: {
    nav: {
      home: 'หน้าแรก',
      catalog: 'แคตตาล็อก',
    },
    hero: {
      headline: 'ดอกไม้สดส่งถึงมือด้วยความใส่ใจ',
      subline: 'เลือกช่อดอกไม้ที่เหมาะกับทุกโอกาส',
      cta: 'เลือกช่อดอกไม้',
    },
    categories: {
      all: 'ช่อดอกไม้ทั้งหมด',
      roses: 'กุหลาบ',
      mixed: 'ช่อผสม',
      mono: 'ช่อเดี่ยว',
      inBox: 'ดอกไม้ในกล่อง',
      romantic: 'โรแมนติก',
      birthday: 'วันเกิด',
      sympathy: 'แสดงความอาลัย',
    },
    catalog: {
      title: 'ช่อดอกไม้ของเรา',
      from: 'เริ่มต้น',
      viewDetails: 'ดูรายละเอียด',
    },
    product: {
      composition: 'องค์ประกอบ',
      size: 'ขนาด',
      orderVia: 'สั่งผ่าน',
      orderLine: 'สั่งผ่าน LINE',
      orderWhatsApp: 'สั่งผ่าน WhatsApp',
      orderTelegram: 'สั่งผ่าน Telegram',
      orderFacebook: 'สั่งผ่าน Facebook',
      messageTemplate: 'สวัสดีครับ/ค่ะ ต้องการสั่งช่อ {name} ขนาด {size}',
    },
    messenger: {
      line: 'LINE',
      whatsapp: 'WhatsApp',
      telegram: 'Telegram',
      facebook: 'Facebook',
    },
  },
} as const;

export type TranslationKey = keyof typeof translations.en;
