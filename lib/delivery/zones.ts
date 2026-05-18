/**
 * Zone registry: delivery_destination + delivery_zone_id → fee (THB).
 * Expansion fees are floored defensively in getZoneFee.
 */

import type { DeliveryDestinationId } from '@/lib/delivery/markets';
import { isExpansionDestination } from '@/lib/delivery/markets';
import type { DistrictKey } from '@/lib/deliveryFees';
import type { Locale } from '@/lib/i18n';

const EXPANSION_FEE_FLOOR_THB = 250;

export interface DeliveryZoneDef {
  id: string;
  labelEn: string;
  labelTh: string;
  feeThb: number;
  /** When set, inferred postcode must match one of these or a prefix rule, else checkout rejected */
  postalCodes?: string[];
  postalPrefixes?: string[];
}

export const ZONES_BY_DESTINATION: Record<DeliveryDestinationId, DeliveryZoneDef[]> = {
  CHIANG_MAI: [
    { id: 'cm-mueang-central', labelEn: 'Mueang Chiang Mai — central', labelTh: 'เมืองเชียงใหม่ — ใจกลาง', feeThb: 250 },
    { id: 'cm-mueang-non-central', labelEn: 'Mueang Chiang Mai — other areas', labelTh: 'เมืองเชียงใหม่ — พื้นที่อื่น', feeThb: 350 },
    { id: 'cm-nong-pa-khrang', labelEn: 'Nong Pa Khrang', labelTh: 'หนองป่าคร้าง', feeThb: 300 },
    { id: 'cm-chang-phueak', labelEn: 'Chang Phueak', labelTh: 'ช้างเผือก', feeThb: 350 },
    { id: 'cm-saraphi', labelEn: 'Saraphi', labelTh: 'สารภี', feeThb: 350 },
    { id: 'cm-san-sai', labelEn: 'San Sai', labelTh: 'สันทราย', feeThb: 350 },
    { id: 'cm-hang-dong', labelEn: 'Hang Dong', labelTh: 'หางดง', feeThb: 450 },
    { id: 'cm-san-kamphaeng', labelEn: 'San Kamphaeng', labelTh: 'สันกำแพง', feeThb: 450 },
    { id: 'cm-mae-rim', labelEn: 'Mae Rim', labelTh: 'แม่ริม', feeThb: 450 },
    { id: 'cm-lamphun', labelEn: 'Lamphun', labelTh: 'ลำพูน', feeThb: 350 },
    { id: 'cm-doi-saket', labelEn: 'Doi Saket', labelTh: 'ดอยสะเก็ด', feeThb: 550 },
    { id: 'cm-mae-on', labelEn: 'Mae On', labelTh: 'แม่ออน', feeThb: 550 },
    { id: 'cm-samoeng', labelEn: 'Samoeng', labelTh: 'สะเมิง', feeThb: 550 },
    { id: 'cm-mae-taeng', labelEn: 'Mae Taeng', labelTh: 'แม่แตง', feeThb: 550 },
    { id: 'cm-unknown', labelEn: 'Other / unknown area', labelTh: 'อื่นๆ / ไม่ทราบพื้นที่', feeThb: 550 },
  ],
  PATTAYA: [
    { id: 'pat-central-pattaya', labelEn: 'Central Pattaya', labelTh: 'พัทยากลาง', feeThb: 250 },
    { id: 'pat-north-naklua-wongamat', labelEn: 'North Pattaya / Naklua / Wongamat', labelTh: 'พัทยาเหนือ / นาจอมเทียน / วงศ์อมาตย์', feeThb: 250 },
    { id: 'pat-south-walking-street', labelEn: 'South Pattaya / Walking Street area', labelTh: 'พัทยาใต้ / วอล์คกิ้งสตรีท', feeThb: 250 },
    { id: 'pat-pratumnak', labelEn: 'Pratumnak', labelTh: 'พระตำหนัก', feeThb: 250 },
    { id: 'pat-jomtien', labelEn: 'Jomtien', labelTh: 'จอมเทียน', feeThb: 250 },
    { id: 'pat-na-jomtien', labelEn: 'Na Jomtien', labelTh: 'นาจอมเทียน', feeThb: 350 },
    { id: 'pat-east-nong-prue', labelEn: 'East Pattaya / Nong Prue', labelTh: 'พัทยาตะวันออก / หนองปรือ', feeThb: 350 },
  ],
  PHUKET: [
    { id: 'hkt-phuket-town', labelEn: 'Phuket Town / Talad Yai / Talad Nuea', labelTh: 'เมืองภูเก็ต / ตลาดใหญ่ / ตลาดเหนือ', feeThb: 250 },
    { id: 'hkt-kathu', labelEn: 'Kathu', labelTh: 'กะทู้', feeThb: 250 },
    { id: 'hkt-chalong', labelEn: 'Chalong', labelTh: 'ฉลอง', feeThb: 300 },
    { id: 'hkt-rawai-nai-harn', labelEn: 'Rawai / Nai Harn', labelTh: 'ราไวย์ / ในหาน', feeThb: 350 },
    { id: 'hkt-kata-karon', labelEn: 'Kata / Karon', labelTh: 'กะตะ / กะรน', feeThb: 350 },
    { id: 'hkt-patong', labelEn: 'Patong', labelTh: 'ป่าตอง', feeThb: 350 },
    { id: 'hkt-kamala', labelEn: 'Kamala', labelTh: 'กมลา', feeThb: 400 },
    { id: 'hkt-cherng-talay-bang-tao-laguna', labelEn: 'Cherng Talay / Bang Tao / Laguna', labelTh: 'เชิงทะเล / บางเทา / ลากูน่า', feeThb: 450 },
    { id: 'hkt-thalang-thep-krasattri', labelEn: 'Thalang / Thep Krasattri', labelTh: 'ถลาง / เทพกระษัตรี', feeThb: 450 },
    { id: 'hkt-pa-khlok-remote-east', labelEn: 'Pa Khlok / remote east Phuket', labelTh: 'ป่าคลอก / ภูเก็ตตะวันออกห่างไกล', feeThb: 550 },
    { id: 'hkt-mai-khao-airport-sakhu', labelEn: 'Mai Khao / Airport / Sakhu', labelTh: 'ไม้ขาว / สนามบิน / สะกู', feeThb: 550 },
  ],
  KRABI: [
    { id: 'kbn-ao-nang-center', labelEn: 'Ao Nang Center', labelTh: 'อ่าวนางกลาง', feeThb: 250 },
    { id: 'kbn-noppharat-thara', labelEn: 'Noppharat Thara', labelTh: 'นพรัตน์ธารา', feeThb: 250 },
    { id: 'kbn-krabi-town', labelEn: 'Krabi Town', labelTh: 'เมืองกระบี่', feeThb: 300 },
    { id: 'kbn-klong-muang', labelEn: 'Klong Muang', labelTh: 'คลองม่วง', feeThb: 350 },
    { id: 'kbn-tubkaek', labelEn: 'Tubkaek', labelTh: 'ถ้ำแขก', feeThb: 450 },
  ],
  SAMUI: [
    { id: 'sui-chaweng', labelEn: 'Chaweng', labelTh: 'เฉวง', feeThb: 250 },
    { id: 'sui-bophut-fisherman', labelEn: 'Bo Phut / Fisherman\'s Village', labelTh: 'บ่อผุด / ฟิชเชอร์แมนวิลเลจ', feeThb: 250 },
    { id: 'sui-lamai', labelEn: 'Lamai', labelTh: 'ละไม', feeThb: 300 },
    { id: 'sui-maenam', labelEn: 'Mae Nam', labelTh: 'แม่น้ำ', feeThb: 300 },
    { id: 'sui-bangrak-choengmon', labelEn: 'Bangrak / Choeng Mon', labelTh: 'บางรัก / เชิงมน', feeThb: 300 },
    { id: 'sui-lipa-noi-taling-ngam', labelEn: 'Lipa Noi / Taling Ngam', labelTh: 'ลิปะน้อย / ตลิ่งงาม', feeThb: 350 },
    { id: 'sui-na-thon-ang-thong', labelEn: 'Na Thon / Ang Thong', labelTh: 'หน้าทอน / อ่างทอง', feeThb: 350 },
    { id: 'sui-hua-thanon', labelEn: 'Hua Thanon', labelTh: 'หัวถนน', feeThb: 350 },
  ],
  HUA_HIN: [
    { id: 'hhi-center', labelEn: 'Hua Hin Center', labelTh: 'หัวหินกลาง', feeThb: 250 },
    { id: 'hhi-khao-takiab-nong-kae', labelEn: 'Khao Takiab / Nong Kae', labelTh: 'เขาตะเกียบ / หนองแก', feeThb: 250 },
    { id: 'hhi-bo-fai-airport', labelEn: 'Bo Fai / Hua Hin Airport area', labelTh: 'บ่อฝาย / พื้นที่สนามบินหัวหิน', feeThb: 250 },
    { id: 'hhi-hua-don', labelEn: 'Hua Don', labelTh: 'หัวดอน', feeThb: 250 },
    { id: 'hhi-hin-lek-fai', labelEn: 'Hin Lek Fai', labelTh: 'หินเหล็กไฟ', feeThb: 300 },
    { id: 'hhi-thap-tai', labelEn: 'Thap Tai', labelTh: 'ทับใต้', feeThb: 350 },
  ],
};

export function getZonesForDestination(destinationId: DeliveryDestinationId): DeliveryZoneDef[] {
  return ZONES_BY_DESTINATION[destinationId] ?? [];
}

export function findZoneDef(
  destinationId: DeliveryDestinationId,
  zoneId: string
): DeliveryZoneDef | undefined {
  return getZonesForDestination(destinationId).find((z) => z.id === zoneId);
}

export function isSupportedZone(destinationId: DeliveryDestinationId, zoneId: string): boolean {
  return Boolean(findZoneDef(destinationId, zoneId));
}

/**
 * Fee for destination + zone. Null if zone unknown for destination.
 */
export function getZoneFee(destinationId: DeliveryDestinationId, zoneId: string): number | null {
  const z = findZoneDef(destinationId, zoneId);
  if (!z) return null;
  if (isExpansionDestination(destinationId)) {
    return Math.max(z.feeThb, EXPANSION_FEE_FLOOR_THB);
  }
  return z.feeThb;
}

export function zoneLabel(
  destinationId: DeliveryDestinationId,
  zoneId: string,
  lang: Locale
): string | null {
  const z = findZoneDef(destinationId, zoneId);
  if (!z) return null;
  return lang === 'th' ? z.labelTh : z.labelEn;
}

/** Mirror legacy `district` column + Mueang central flag from Chiang Mai zone id */
export function legacyDistrictFromChiangMaiZone(zoneId: string): {
  deliveryDistrict: DistrictKey;
  isMueangCentral: boolean;
} {
  const map: Record<string, { deliveryDistrict: DistrictKey; isMueangCentral: boolean }> = {
    'cm-mueang-central': { deliveryDistrict: 'MUEANG', isMueangCentral: true },
    'cm-mueang-non-central': { deliveryDistrict: 'MUEANG', isMueangCentral: false },
    'cm-nong-pa-khrang': { deliveryDistrict: 'MUEANG', isMueangCentral: false },
    'cm-chang-phueak': { deliveryDistrict: 'MUEANG', isMueangCentral: false },
    'cm-saraphi': { deliveryDistrict: 'SARAPHI', isMueangCentral: false },
    'cm-san-sai': { deliveryDistrict: 'SAN_SAI', isMueangCentral: false },
    'cm-hang-dong': { deliveryDistrict: 'HANG_DONG', isMueangCentral: false },
    'cm-san-kamphaeng': { deliveryDistrict: 'SAN_KAMPHAENG', isMueangCentral: false },
    'cm-mae-rim': { deliveryDistrict: 'MAE_RIM', isMueangCentral: false },
    'cm-lamphun': { deliveryDistrict: 'LAMPHUN', isMueangCentral: false },
    'cm-doi-saket': { deliveryDistrict: 'DOI_SAKET', isMueangCentral: false },
    'cm-mae-on': { deliveryDistrict: 'MAE_ON', isMueangCentral: false },
    'cm-samoeng': { deliveryDistrict: 'SAMOENG', isMueangCentral: false },
    'cm-mae-taeng': { deliveryDistrict: 'MAE_TAENG', isMueangCentral: false },
    'cm-unknown': { deliveryDistrict: 'UNKNOWN', isMueangCentral: false },
  };
  return map[zoneId] ?? { deliveryDistrict: 'UNKNOWN', isMueangCentral: false };
}

/** Migrate old cart form (district + central) to Chiang Mai zone id */
export function chiangMaiZoneIdFromLegacyDistrict(
  district: DistrictKey | '',
  isMueangCentral: boolean
): string {
  if (!district) return '';
  if (district === 'MUEANG') {
    return isMueangCentral ? 'cm-mueang-central' : 'cm-mueang-non-central';
  }
  const d2z: Partial<Record<DistrictKey, string>> = {
    SARAPHI: 'cm-saraphi',
    SAN_SAI: 'cm-san-sai',
    HANG_DONG: 'cm-hang-dong',
    SAN_KAMPHAENG: 'cm-san-kamphaeng',
    MAE_RIM: 'cm-mae-rim',
    LAMPHUN: 'cm-lamphun',
    DOI_SAKET: 'cm-doi-saket',
    MAE_ON: 'cm-mae-on',
    SAMOENG: 'cm-samoeng',
    MAE_TAENG: 'cm-mae-taeng',
    UNKNOWN: 'cm-unknown',
  };
  return d2z[district] ?? 'cm-unknown';
}

/**
 * When zone has postal allowlists and we inferred a postcode, it must match.
 */
export function isInferredPostcodeAllowedForZone(
  inferredPostal: string | null,
  zone: DeliveryZoneDef | undefined
): boolean {
  if (!inferredPostal || !zone) return true;
  const { postalCodes, postalPrefixes } = zone;
  if (!postalCodes?.length && !postalPrefixes?.length) return true;
  const inCodes = postalCodes?.includes(inferredPostal) ?? false;
  const inPrefix =
    postalPrefixes?.some((p) => inferredPostal.startsWith(p.replace(/\D/g, ''))) ?? false;
  return inCodes || inPrefix;
}
