/** Partner portal constants — districts, categories, prep times */

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
  { value: 'flowers', labelTh: 'ดอกไม้', labelEn: 'Flowers', icon: '🌸' },
  { value: 'balloons', labelTh: 'บอลลูน', labelEn: 'Balloons', icon: '🎈' },
  { value: 'gifts', labelTh: 'ของขวัญ', labelEn: 'Gifts', icon: '🎁' },
  { value: 'money_flowers', labelTh: 'ดอกไม้ธนบัตร', labelEn: 'Money Flowers', icon: '💵' },
  { value: 'handmade_floral', labelTh: 'งานประดิษฐ์', labelEn: 'Handmade Floral', icon: '✂️' },
] as const;

export const PREP_TIME_OPTIONS = [
  { value: '30', labelTh: '30 นาที', labelEn: '30 min' },
  { value: '60', labelTh: '1 ชั่วโมง', labelEn: '1 hour' },
  { value: '120', labelTh: '2 ชั่วโมง', labelEn: '2 hours' },
  { value: '240', labelTh: '4+ ชั่วโมง', labelEn: '4+ hours' },
] as const;
