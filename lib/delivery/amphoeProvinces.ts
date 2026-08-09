/**
 * Provinces that support amphoe map drill-down on the national coverage map.
 */

import type { DeliveryDestinationId } from '@/lib/delivery/markets';
import {
  AMPHOE_MAP_DISTRICTS,
  AMPHOE_MAP_OTHER,
  getAmphoeByAmpCode,
  getAmphoeById,
  type AmphoeMapDistrict,
} from '@/lib/delivery/amphoeMapData';
import {
  getLamphunAmphoeByAmpCode,
  getLamphunAmphoeById,
  LAMPHUN_AMPHOE_MAP_DISTRICTS,
  type LamphunAmphoeMapDistrict,
} from '@/lib/delivery/lamphunAmphoeMapData';
import type { AmphoeFeeSource } from '@/lib/delivery/amphoeDisplayFees';

export type AmphoeCapableProvinceCode = 'chiang-mai' | 'lamphun';

export type ProvinceAmphoeDistrict = (AmphoeMapDistrict | LamphunAmphoeMapDistrict) &
  AmphoeFeeSource & {
    id: string;
    ampCode: string;
    labelEn: string;
    labelTh: string;
  };

const AMPHOE_CAPABLE = new Set<string>(['chiang-mai', 'lamphun']);

export function isAmphoeCapableProvince(code: string | null | undefined): boolean {
  return Boolean(code && AMPHOE_CAPABLE.has(code));
}

export function amphoeMapApiPath(provinceCode: AmphoeCapableProvinceCode): string {
  return `/api/maps/${provinceCode}-amphoes`;
}

export function destinationIdForAmphoeProvince(
  provinceCode: AmphoeCapableProvinceCode
): DeliveryDestinationId {
  return provinceCode === 'lamphun' ? 'LAMPHUN' : 'CHIANG_MAI';
}

export function getAmphoeDistrictsForProvince(
  provinceCode: AmphoeCapableProvinceCode
): ProvinceAmphoeDistrict[] {
  if (provinceCode === 'lamphun') {
    return LAMPHUN_AMPHOE_MAP_DISTRICTS as ProvinceAmphoeDistrict[];
  }
  return AMPHOE_MAP_DISTRICTS.filter((d) => d.id !== 'other') as ProvinceAmphoeDistrict[];
}

export function getAmphoeByAmpCodeForProvince(
  provinceCode: AmphoeCapableProvinceCode,
  ampCode: string
): ProvinceAmphoeDistrict | undefined {
  if (provinceCode === 'lamphun') {
    return getLamphunAmphoeByAmpCode(ampCode) as ProvinceAmphoeDistrict | undefined;
  }
  return getAmphoeByAmpCode(ampCode) as ProvinceAmphoeDistrict | undefined;
}

export function getAmphoeByIdForProvince(
  provinceCode: AmphoeCapableProvinceCode,
  id: string
): ProvinceAmphoeDistrict | undefined {
  if (provinceCode === 'lamphun') {
    return getLamphunAmphoeById(id) as ProvinceAmphoeDistrict | undefined;
  }
  return getAmphoeById(id as never) as ProvinceAmphoeDistrict | undefined;
}

/** Chiang Mai “other / not listed” row — Lamphun has no equivalent. */
export function getOtherAmphoeForProvince(
  provinceCode: AmphoeCapableProvinceCode
): AmphoeFeeSource | null {
  if (provinceCode === 'chiang-mai') return AMPHOE_MAP_OTHER;
  return null;
}
