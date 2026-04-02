import type { BouquetSellableOption, ProductKind, SizeKey } from '@/lib/bouquetOptions';

export type { BouquetSellableOption, ProductKind, SizeKey } from '@/lib/bouquetOptions';
/** @deprecated use BouquetSellableOption */
export type BouquetSize = BouquetSellableOption;

export type BouquetStatus = 'pending_review' | 'approved' | 'rejected';

export interface Bouquet {
  id: string;
  slug: string;
  nameEn: string;
  nameTh: string;
  descriptionEn: string;
  descriptionTh: string;
  compositionEn: string;
  compositionTh: string;
  category: string;
  /** Hybrid model; default legacy when unset in CMS */
  productKind?: ProductKind;
  colors?: string[];
  flowerTypes?: string[];
  occasion?: string[];
  /** Catalog facets */
  deliveryOptions?: string[];
  presentationFormats?: string[];
  images: string[];
  /** Unified sellable lines — always non-empty after map */
  sizes: BouquetSellableOption[];
  partnerId?: string;
  partnerName?: string;
  partnerCity?: string;
  partnerShopBioEn?: string;
  partnerShopBioTh?: string;
  partnerPortraitUrl?: string;
  status?: BouquetStatus;
}

export type PartnerStatus = 'pending_review' | 'approved' | 'disabled';

export interface Partner {
  id: string;
  shopName: string;
  contactName: string;
  phoneNumber: string;
  lineOrWhatsapp?: string;
  shopAddress?: string;
  shopBioEn?: string;
  shopBioTh?: string;
  portraitUrl?: string;
  city: string;
  status: PartnerStatus;
  supabaseUserId?: string;
}

// Placeholder images (Unsplash) – replace with your CMS URLs later
const img = (id: string, w = 600) =>
  `https://images.unsplash.com/photo-${id}?w=${w}&q=80`;

function legacyOption(
  key: SizeKey,
  label: string,
  price: number,
  description: string
): BouquetSellableOption {
  return {
    optionId: `legacy_${key}`,
    key,
    price,
    label,
    description,
    availability: true,
  };
}

export const bouquets: Bouquet[] = [
  {
    id: '1',
    slug: 'classic-roses',
    nameEn: 'Classic Red Roses',
    nameTh: 'กุหลาบแดงคลาสสิก',
    descriptionEn: 'Timeless elegance with premium red roses.',
    descriptionTh: 'ความสง่างามเหนือกาลเวลาด้วยกุหลาบแดงพรีเมียม',
    compositionEn: 'Red roses, eucalyptus, ribbon',
    compositionTh: 'กุหลาบแดง ยูคาลิปตัส ริบบิ้น',
    category: 'roses',
    productKind: 'legacy',
    images: [
      img('1518895949257-762e860e6f5b'),
      img('1490757867850-704c4c2d6aac'),
      img('1455659817273-f96807779a8a'),
    ],
    sizes: [
      legacyOption('s', '7 stems', 890, '7 stems'),
      legacyOption('m', '12 stems', 1290, '12 stems'),
      legacyOption('l', '24 stems', 1890, '24 stems'),
      legacyOption('xl', '36 stems', 2590, '36 stems'),
    ],
  },
  {
    id: '2',
    slug: 'pastel-dream',
    nameEn: 'Pastel Dream',
    nameTh: 'ความฝันพาสเทล',
    descriptionEn: 'Soft pastel mix for a gentle statement.',
    descriptionTh: 'ช่อผสมพาสเทลนุ่มสำหรับความประทับใจอันอ่อนโยน',
    compositionEn: 'Pink roses, white hydrangea, baby\'s breath',
    compositionTh: 'กุหลาบชมพู ไฮเดรนเยียขาว เบบี้เบรธ',
    category: 'mixed',
    productKind: 'legacy',
    images: [
      img('1490757867850-704c4c2d6aac'),
      img('1518895949257-762e860e6f5b'),
      img('1455659817273-f96807779a8a'),
    ],
    sizes: [
      legacyOption('s', 'Small hand-tied', 990, 'Small hand-tied'),
      legacyOption('m', 'Medium hand-tied', 1490, 'Medium hand-tied'),
      legacyOption('l', 'Large hand-tied', 2190, 'Large hand-tied'),
      legacyOption('xl', 'Premium large', 2990, 'Premium large'),
    ],
  },
  {
    id: '3',
    slug: 'sunshine-box',
    nameEn: 'Sunshine in a Box',
    nameTh: 'แสงแดดในกล่อง',
    descriptionEn: 'Bright seasonal flowers in an elegant box.',
    descriptionTh: 'ดอกไม้ตามฤดูกาลสดใสในกล่องสวยงาม',
    compositionEn: 'Sunflowers, chrysanthemums, greens',
    compositionTh: 'ดอกทานตะวัน เบญจมาศ ใบไม้เขียว',
    category: 'inBox',
    productKind: 'legacy',
    images: [
      img('1455659817273-f96807779a8a'),
      img('1490757867850-704c4c2d6aac'),
      img('1518895949257-762e860e6f5b'),
    ],
    sizes: [
      legacyOption('s', 'Compact box', 790, 'Compact box'),
      legacyOption('m', 'Standard box', 1190, 'Standard box'),
      legacyOption('l', 'Large box', 1690, 'Large box'),
      legacyOption('xl', 'Premium box', 2290, 'Premium box'),
    ],
  },
  {
    id: '4',
    slug: 'romantic-pink',
    nameEn: 'Romantic Pink',
    nameTh: 'โรแมนติกชมพู',
    descriptionEn: 'Perfect for expressing love and appreciation.',
    descriptionTh: 'เหมาะสำหรับแสดงความรักและความซาบซึ้ง',
    compositionEn: 'Pink roses, peonies, eucalyptus',
    compositionTh: 'กุหลาบชมพู ดอกโบตั๋น ยูคาลิปตัส',
    category: 'romantic',
    productKind: 'legacy',
    images: [
      img('1490757867850-704c4c2d6aac'),
      img('1455659817273-f96807779a8a'),
      img('1518895949257-762e860e6f5b'),
    ],
    sizes: [
      legacyOption('s', 'Petite', 1090, 'Petite'),
      legacyOption('m', 'Classic', 1590, 'Classic'),
      legacyOption('l', 'Grand', 2290, 'Grand'),
      legacyOption('xl', 'Luxury', 3190, 'Luxury'),
    ],
  },
  {
    id: '5',
    slug: 'birthday-joy',
    nameEn: 'Birthday Joy',
    nameTh: 'ความสุขวันเกิด',
    descriptionEn: 'Colorful and cheerful for celebrations.',
    descriptionTh: 'สดใสและรื่นเริงสำหรับงานฉลอง',
    compositionEn: 'Mixed seasonal flowers, ribbon',
    compositionTh: 'ดอกไม้ตามฤดูกาลผสม ริบบิ้น',
    category: 'birthday',
    productKind: 'legacy',
    images: [
      img('1518895949257-762e860e6f5b'),
      img('1490757867850-704c4c2d6aac'),
      img('1455659817273-f96807779a8a'),
    ],
    sizes: [
      legacyOption('s', 'Small', 690, 'Small'),
      legacyOption('m', 'Medium', 990, 'Medium'),
      legacyOption('l', 'Large', 1390, 'Large'),
      legacyOption('xl', 'Extra large', 1890, 'Extra large'),
    ],
  },
  {
    id: '6',
    slug: 'white-sympathy',
    nameEn: 'White Sympathy',
    nameTh: 'แสดงความอาลัยสีขาว',
    descriptionEn: 'Elegant white arrangement for remembrance.',
    descriptionTh: 'จัดดอกไม้สีขาวสง่างามเพื่อระลึกถึง',
    compositionEn: 'White lilies, roses, chrysanthemums',
    compositionTh: 'ดอกลิลลี่ขาว กุหลาบขาว เบญจมาศขาว',
    category: 'sympathy',
    productKind: 'legacy',
    images: [
      img('1455659817273-f96807779a8a'),
      img('1518895949257-762e860e6f5b'),
      img('1490757867850-704c4c2d6aac'),
    ],
    sizes: [
      legacyOption('s', 'Modest', 990, 'Modest'),
      legacyOption('m', 'Standard', 1490, 'Standard'),
      legacyOption('l', 'Standing', 2190, 'Standing'),
      legacyOption('xl', 'Premium', 2990, 'Premium'),
    ],
  },
];

const slugToBouquet = new Map(bouquets.map((b) => [b.slug, b]));

export function getBouquetBySlug(slug: string): Bouquet | undefined {
  return slugToBouquet.get(slug);
}

export function getBouquetById(id: string): Bouquet | undefined {
  return bouquets.find((b) => b.id === id);
}

export function getBouquetsByCategory(category: string): Bouquet[] {
  if (!category || category === 'all') return bouquets;
  return bouquets.filter((b) => b.category === category);
}
