/**
 * District-based delivery fee calculation for Chiang Mai.
 * Server is source of truth; client uses for live preview only.
 */

/** Internal district keys (stable, used in payload). */
export type DistrictKey =
  | 'MUEANG'
  | 'SARAPHI'
  | 'SAN_SAI'
  | 'HANG_DONG'
  | 'SAN_KAMPHAENG'
  | 'MAE_RIM'
  | 'DOI_SAKET'
  | 'MAE_ON'
  | 'SAMOENG'
  | 'MAE_TAENG'
  | 'UNKNOWN';

export interface DistrictOption {
  key: DistrictKey;
  labelEn: string;
  labelTh: string;
}

export const DISTRICTS: DistrictOption[] = [
  { key: 'MUEANG', labelEn: 'Mueang Chiang Mai', labelTh: 'อำเภอเมืองเชียงใหม่' },
  { key: 'SARAPHI', labelEn: 'Saraphi', labelTh: 'อำเภอสารภี' },
  { key: 'SAN_SAI', labelEn: 'San Sai', labelTh: 'อำเภอสันทราย' },
  { key: 'HANG_DONG', labelEn: 'Hang Dong', labelTh: 'อำเภอหางดง' },
  { key: 'SAN_KAMPHAENG', labelEn: 'San Kamphaeng', labelTh: 'อำเภอสันกำแพง' },
  { key: 'MAE_RIM', labelEn: 'Mae Rim', labelTh: 'อำเภอแม่ริม' },
  { key: 'DOI_SAKET', labelEn: 'Doi Saket', labelTh: 'อำเภอดอยสะเก็ด' },
  { key: 'MAE_ON', labelEn: 'Mae On', labelTh: 'อำเภอแม่ออน' },
  { key: 'SAMOENG', labelEn: 'Samoeng', labelTh: 'อำเภอสะเมิง' },
  { key: 'MAE_TAENG', labelEn: 'Mae Taeng', labelTh: 'อำเภอแม่แตง' },
  { key: 'UNKNOWN', labelEn: 'Other / Unknown', labelTh: 'อื่นๆ / ไม่ทราบ' },
];

export interface CalcDeliveryFeeInput {
  district: DistrictKey;
  isMueangCentral: boolean;
}

/**
 * Compute delivery fee in THB based on district and central toggle.
 * Server uses this; never trust client-provided fee.
 */
export function calcDeliveryFeeTHB(input: CalcDeliveryFeeInput): number {
  const { district, isMueangCentral } = input;

  if (district === 'MUEANG') {
    return isMueangCentral ? 200 : 300;
  }

  switch (district) {
    case 'SARAPHI':
    case 'SAN_SAI':
      return 300;
    case 'HANG_DONG':
    case 'SAN_KAMPHAENG':
    case 'MAE_RIM':
      return 400;
    case 'DOI_SAKET':
    case 'MAE_ON':
    case 'SAMOENG':
    case 'MAE_TAENG':
    case 'UNKNOWN':
    default:
      return 500;
  }
}

/** Keywords for district detection (lowercase). Order matters: more specific first. */
const DISTRICT_KEYWORDS: { key: DistrictKey; patterns: string[] }[] = [
  { key: 'MAE_TAENG', patterns: ['mae taeng', 'แม่แตง', 'อ.แม่แตง', 'อำเภอแม่แตง'] },
  { key: 'MAE_ON', patterns: ['mae on', 'แม่ออน', 'อ.แม่ออน', 'อำเภอแม่ออน'] },
  { key: 'SAMOENG', patterns: ['samoeng', 'สะเมิง', 'อ.สะเมิง', 'อำเภอสะเมิง'] },
  { key: 'DOI_SAKET', patterns: ['doi saket', 'ดอยสะเก็ด', 'อ.ดอยสะเก็ด', 'อำเภอดอยสะเก็ด'] },
  { key: 'MAE_RIM', patterns: ['mae rim', 'แม่ริม', 'อ.แม่ริม', 'อำเภอแม่ริม'] },
  { key: 'SAN_KAMPHAENG', patterns: ['san kamphaeng', 'สันกำแพง', 'อ.สันกำแพง', 'อำเภอสันกำแพง'] },
  { key: 'HANG_DONG', patterns: ['hang dong', 'หางดง', 'อ.หางดง', 'อำเภอหางดง'] },
  { key: 'SAN_SAI', patterns: ['san sai', 'สันทราย', 'อ.สันทราย', 'อำเภอสันทราย'] },
  { key: 'SARAPHI', patterns: ['saraphi', 'สารภี', 'อ.สารภี', 'อำเภอสารภี'] },
  {
    key: 'MUEANG',
    patterns: [
      'mueang',
      'muang',
      'เมืองเชียงใหม่',
      'อ.เมือง',
      'อำเภอเมือง',
      'old city',
      'nimman',
      'santitham',
      'night bazaar',
      'wat ket',
      'นิมมาน',
      'สันติธรรม',
      'ไนท์บาซาร์',
      'วัดเกต',
    ],
  },
];

/**
 * Auto-detect district from address text.
 * Returns district key or null if no match.
 */
export function detectDistrictFromAddress(addressText: string): DistrictKey | null {
  const normalized = addressText
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');

  if (!normalized) return null;

  for (const { key, patterns } of DISTRICT_KEYWORDS) {
    for (const p of patterns) {
      if (normalized.includes(p)) {
        return key;
      }
    }
  }

  return null;
}
