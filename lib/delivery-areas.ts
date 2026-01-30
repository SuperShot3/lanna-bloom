/**
 * Chiang Mai province districts (amphoe). City is fixed: Chiang Mai only.
 */
export interface District {
  id: string;
  nameEn: string;
  nameTh: string;
}

export const CITY_EN = 'Chiang Mai';
export const CITY_TH = 'เชียงใหม่';

export const CHIANG_MAI_DISTRICTS: District[] = [
  { id: 'mueang-chiang-mai', nameEn: 'Mueang Chiang Mai', nameTh: 'เมืองเชียงใหม่' },
  { id: 'chom-thong', nameEn: 'Chom Thong', nameTh: 'จอมทอง' },
  { id: 'mae-chaem', nameEn: 'Mae Chaem', nameTh: 'แม่แจ่ม' },
  { id: 'chiang-dao', nameEn: 'Chiang Dao', nameTh: 'เชียงดาว' },
  { id: 'doi-saket', nameEn: 'Doi Saket', nameTh: 'ดอยสะเก็ด' },
  { id: 'mae-taeng', nameEn: 'Mae Taeng', nameTh: 'แม่แตง' },
  { id: 'mae-rim', nameEn: 'Mae Rim', nameTh: 'แม่ริม' },
  { id: 'samoeng', nameEn: 'Samoeng', nameTh: 'สะเมิง' },
  { id: 'fang', nameEn: 'Fang', nameTh: 'ฝาง' },
  { id: 'mae-ai', nameEn: 'Mae Ai', nameTh: 'แม่เอ๋ย' },
  { id: 'phrao', nameEn: 'Phrao', nameTh: 'พร้าว' },
  { id: 'san-pa-tong', nameEn: 'San Pa Tong', nameTh: 'สันป่าตอง' },
  { id: 'san-kamphaeng', nameEn: 'San Kamphaeng', nameTh: 'สันกำแพง' },
  { id: 'san-sai', nameEn: 'San Sai', nameTh: 'สันทราย' },
  { id: 'hang-dong', nameEn: 'Hang Dong', nameTh: 'หางดง' },
  { id: 'hot', nameEn: 'Hot', nameTh: 'ฮอด' },
  { id: 'doi-tao', nameEn: 'Doi Tao', nameTh: 'ดอยเต่า' },
  { id: 'omkoi', nameEn: 'Omkoi', nameTh: 'อมก๋อย' },
  { id: 'saraphi', nameEn: 'Saraphi', nameTh: 'สารภี' },
  { id: 'wiang-haeng', nameEn: 'Wiang Haeng', nameTh: 'เวียงแหง' },
  { id: 'chai-prakan', nameEn: 'Chai Prakan', nameTh: 'ไชยปราการ' },
  { id: 'mae-wang', nameEn: 'Mae Wang', nameTh: 'แม่วาง' },
  { id: 'mae-on', nameEn: 'Mae On', nameTh: 'แม่โถ' },
  { id: 'doi-lo', nameEn: 'Doi Lo', nameTh: 'ดอยหล่อ' },
  { id: 'galyani-vadhana', nameEn: 'Galyani Vadhana', nameTh: 'กัลยาณิวัฒนา' },
];
