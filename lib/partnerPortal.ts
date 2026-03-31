/** Partner portal constants — districts, categories, prep times, occasions */

export const DISTRICTS = [
  { value: '', labelTh: 'เลือกอำเภอ…', labelEn: 'Select district…' },
  { value: 'muang', labelTh: 'อ.เมืองเชียงใหม่', labelEn: 'Mueang Chiang Mai' },
  { value: 'hangdong', labelTh: 'หางดง', labelEn: 'Hang Dong' },
  { value: 'saraphi', labelTh: 'สารภี', labelEn: 'Saraphi' },
  { value: 'sansai', labelTh: 'สันทราย', labelEn: 'San Sai' },
  { value: 'doisaket', labelTh: 'ดอยสะเก็ด', labelEn: 'Doi Saket' },
  { value: 'santitham', labelTh: 'สันติธรรม', labelEn: 'Santitham' },
] as const;

export const CATEGORY_OPTIONS = [
  { value: 'flowers', labelTh: 'ดอกไม้', labelEn: 'Flowers', icon: '💐' },
  { value: 'balloons', labelTh: 'บอลลูน', labelEn: 'Balloons', icon: '🎈' },
  { value: 'gifts', labelTh: 'ของขวัญ & เซ็ต', labelEn: 'Gifts & Sets', icon: '🎁' },
  { value: 'money_flowers', labelTh: 'ดอกไม้ธนบัตร', labelEn: 'Money Flowers', icon: '💵' },
  { value: 'handmade_floral', labelTh: 'งานประดิษฐ์ดอกไม้', labelEn: 'Handmade Floral', icon: '🌿' },
  { value: 'food_sweets', labelTh: 'อาหาร & ขนม', labelEn: 'Food & Sweets', icon: '🍓' },
  { value: 'wellness', labelTh: 'สุขภาพ & ผ่อนคลาย', labelEn: 'Wellness', icon: '🕯️' },
  { value: 'toys_plush', labelTh: 'ของเล่น & ตุ๊กตา', labelEn: 'Toys & Plush', icon: '🧸' },
  { value: 'home_lifestyle', labelTh: 'บ้าน & ไลฟ์สไตล์', labelEn: 'Home & Lifestyle', icon: '☕' },
  { value: 'stationery', labelTh: 'เครื่องเขียน', labelEn: 'Stationery', icon: '📖' },
  { value: 'baby_family', labelTh: 'เด็ก & ครอบครัว', labelEn: 'Baby & Family', icon: '👶' },
  { value: 'fashion', labelTh: 'แฟชั่น & เครื่องประดับ', labelEn: 'Fashion & Accessories', icon: '👜' },
  { value: 'seasonal', labelTh: 'ตามฤดูกาล', labelEn: 'Seasonal', icon: '🌿' },
  { value: 'other', labelTh: 'อื่นๆ', labelEn: 'Other', icon: '✦' },
] as const;

export type ProductCategory = Exclude<
  (typeof CATEGORY_OPTIONS)[number]['value'],
  'flowers'
>;

export const NON_FLOWER_CATEGORIES: ProductCategory[] = CATEGORY_OPTIONS
  .filter((c) => c.value !== 'flowers')
  .map((c) => c.value as ProductCategory);

export const PREP_TIME_OPTIONS = [
  { value: '30', labelTh: '30 นาที', labelEn: '30 min' },
  { value: '60', labelTh: '1 ชั่วโมง', labelEn: '1 hour' },
  { value: '120', labelTh: '2 ชั่วโมง', labelEn: '2 hours' },
  { value: '240', labelTh: '4+ ชั่วโมง', labelEn: '4+ hours' },
  { value: 'made_to_order', labelTh: 'สั่งทำ', labelEn: 'Made to order' },
] as const;

export const OCCASION_OPTIONS = [
  { value: 'birthday', labelTh: '🎂 วันเกิด', labelEn: '🎂 Birthday' },
  { value: 'anniversary', labelTh: '💍 ครบรอบ', labelEn: '💍 Anniversary' },
  { value: 'romantic', labelTh: '💝 โรแมนติก', labelEn: '💝 Romantic' },
  { value: 'get_well', labelTh: '🌿 หายเร็วๆ', labelEn: '🌿 Get well soon' },
  { value: 'congrats', labelTh: '🎉 ยินดีด้วย', labelEn: '🎉 Congratulations' },
  { value: 'sympathy', labelTh: '🕊️ แสดงความเสียใจ', labelEn: '🕊️ Sympathy' },
  { value: 'baby_shower', labelTh: '👶 Baby shower', labelEn: '👶 Baby shower' },
  { value: 'housewarming', labelTh: '🏠 ขึ้นบ้านใหม่', labelEn: '🏠 Housewarming' },
  { value: 'graduation', labelTh: '🎓 รับปริญญา', labelEn: '🎓 Graduation' },
  { value: 'just_because', labelTh: '💌 ไม่มีเหตุผลพิเศษ', labelEn: '💌 Just because' },
] as const;
