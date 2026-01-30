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
      headline: 'Fresh flowers, delivered with love',
      subline: 'Hand-crafted bouquets for every moment',
      cta: 'Choose a bouquet',
      trustLine: 'Same-day delivery in Chiang Mai',
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
      deliveryNote: 'Address & delivery date — specify when ordering',
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
      messageTemplateWithDelivery: 'Hello! I want to order bouquet {name}, size {size}. Delivery: {address}. Date: {date}',
    },
    buyNow: {
      title: 'BUY NOW',
      step1: 'SELECT DELIVERY AREA:',
      step3: 'SPECIFY DELIVERY DATE:',
      step4: 'ADD TO CART',
      city: 'Chiang Mai',
      selectDistrict: 'Select District',
      trySearchByPostalCode: 'Try search by postal code.',
      specifyDeliveryDate: 'Specify delivery date',
      selectAreaFirstDate: 'To specify a date, you must first select delivery area.',
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
      headline: 'ดอกไม้สด ส่งถึงมือด้วยความรัก',
      subline: 'ช่อดอกไม้ทำมือสำหรับทุกช่วงเวลา',
      cta: 'เลือกช่อดอกไม้',
      trustLine: 'จัดส่งวันเดียวถึงในเชียงใหม่',
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
      deliveryNote: 'ที่อยู่และวันจัดส่ง — ระบุเมื่อสั่งซื้อ',
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
      messageTemplateWithDelivery: 'สวัสดีครับ/ค่ะ ต้องการสั่งช่อ {name} ขนาด {size} จัดส่งที่ {address} วันที่ {date}',
    },
    buyNow: {
      title: 'สั่งซื้อเลย',
      step1: 'เลือกพื้นที่จัดส่ง:',
      step3: 'ระบุวันจัดส่ง:',
      step4: 'เพิ่มลงตะกร้า',
      city: 'เชียงใหม่',
      selectDistrict: 'เลือกอำเภอ',
      trySearchByPostalCode: 'ลองค้นหาด้วยรหัสไปรษณีย์',
      specifyDeliveryDate: 'ระบุวันจัดส่ง',
      selectAreaFirstDate: 'กรุณาเลือกพื้นที่จัดส่งก่อน',
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
