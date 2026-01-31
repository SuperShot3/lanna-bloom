export type SizeKey = 's' | 'm' | 'l' | 'xl';

export interface BouquetSize {
  key: SizeKey;
  label: string;
  price: number;
  description: string;
  preparationTime?: number;
  availability?: boolean;
}

export type BouquetStatus = 'pending_review' | 'approved';

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
  /** Filter attributes */
  colors?: string[];
  flowerTypes?: string[];
  occasion?: string;
  images: string[];
  sizes: BouquetSize[];
  /** Partner reference ID; undefined for Lanna Bloom own bouquets */
  partnerId?: string;
  /** Only approved bouquets appear on public catalog; missing = approved (backward compat) */
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
  city: string;
  status: PartnerStatus;
}

// Placeholder images (Unsplash) – replace with your CMS URLs later
const img = (id: string, w = 600) =>
  `https://images.unsplash.com/photo-${id}?w=${w}&q=80`;

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
    images: [
      img('1518895949257-762e860e6f5b'),
      img('1490757867850-704c4c2d6aac'),
      img('1455659817273-f96807779a8a'),
    ],
    sizes: [
      { key: 's', label: 'S', price: 890, description: '7 stems' },
      { key: 'm', label: 'M', price: 1290, description: '12 stems' },
      { key: 'l', label: 'L', price: 1890, description: '24 stems' },
      { key: 'xl', label: 'XL', price: 2590, description: '36 stems' },
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
    images: [
      img('1490757867850-704c4c2d6aac'),
      img('1518895949257-762e860e6f5b'),
      img('1455659817273-f96807779a8a'),
    ],
    sizes: [
      { key: 's', label: 'S', price: 990, description: 'Small hand-tied' },
      { key: 'm', label: 'M', price: 1490, description: 'Medium hand-tied' },
      { key: 'l', label: 'L', price: 2190, description: 'Large hand-tied' },
      { key: 'xl', label: 'XL', price: 2990, description: 'Premium large' },
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
    images: [
      img('1455659817273-f96807779a8a'),
      img('1490757867850-704c4c2d6aac'),
      img('1518895949257-762e860e6f5b'),
    ],
    sizes: [
      { key: 's', label: 'S', price: 790, description: 'Compact box' },
      { key: 'm', label: 'M', price: 1190, description: 'Standard box' },
      { key: 'l', label: 'L', price: 1690, description: 'Large box' },
      { key: 'xl', label: 'XL', price: 2290, description: 'Premium box' },
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
    images: [
      img('1490757867850-704c4c2d6aac'),
      img('1455659817273-f96807779a8a'),
      img('1518895949257-762e860e6f5b'),
    ],
    sizes: [
      { key: 's', label: 'S', price: 1090, description: 'Petite' },
      { key: 'm', label: 'M', price: 1590, description: 'Classic' },
      { key: 'l', label: 'L', price: 2290, description: 'Grand' },
      { key: 'xl', label: 'XL', price: 3190, description: 'Luxury' },
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
    images: [
      img('1518895949257-762e860e6f5b'),
      img('1490757867850-704c4c2d6aac'),
      img('1455659817273-f96807779a8a'),
    ],
    sizes: [
      { key: 's', label: 'S', price: 690, description: 'Small' },
      { key: 'm', label: 'M', price: 990, description: 'Medium' },
      { key: 'l', label: 'L', price: 1390, description: 'Large' },
      { key: 'xl', label: 'XL', price: 1890, description: 'Extra large' },
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
    images: [
      img('1455659817273-f96807779a8a'),
      img('1518895949257-762e860e6f5b'),
      img('1490757867850-704c4c2d6aac'),
    ],
    sizes: [
      { key: 's', label: 'S', price: 990, description: 'Modest' },
      { key: 'm', label: 'M', price: 1490, description: 'Standard' },
      { key: 'l', label: 'L', price: 2190, description: 'Standing' },
      { key: 'xl', label: 'XL', price: 2990, description: 'Premium' },
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
