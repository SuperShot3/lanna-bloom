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
import {
  CHON_BURI_AMPHOE_MAP_DISTRICTS,
  getChonBuriAmphoeByAmpCode,
  getChonBuriAmphoeById,
  type ChonBuriAmphoeMapDistrict,
} from '@/lib/delivery/chonBuriAmphoeMapData';
import type { AmphoeFeeSource } from '@/lib/delivery/amphoeDisplayFees';

export type AmphoeCapableProvinceCode = 'chiang-mai' | 'lamphun' | 'chon-buri';

export type ProvinceAmphoeDistrict = (
  | AmphoeMapDistrict
  | LamphunAmphoeMapDistrict
  | ChonBuriAmphoeMapDistrict
) &
  AmphoeFeeSource & {
    id: string;
    ampCode: string;
    labelEn: string;
    labelTh: string;
  };

const AMPHOE_CAPABLE = new Set<string>(['chiang-mai', 'lamphun', 'chon-buri']);

const DESTINATION_BY_AMPHOE_PROVINCE: Record<
  AmphoeCapableProvinceCode,
  DeliveryDestinationId
> = {
  'chiang-mai': 'CHIANG_MAI',
  lamphun: 'LAMPHUN',
  'chon-buri': 'PATTAYA',
};

export function isAmphoeCapableProvince(code: string | null | undefined): boolean {
  return Boolean(code && AMPHOE_CAPABLE.has(code));
}

export function amphoeMapApiPath(provinceCode: AmphoeCapableProvinceCode): string {
  return `/api/maps/${provinceCode}-amphoes`;
}

export function destinationIdForAmphoeProvince(
  provinceCode: AmphoeCapableProvinceCode
): DeliveryDestinationId {
  return DESTINATION_BY_AMPHOE_PROVINCE[provinceCode];
}

export function getAmphoeDistrictsForProvince(
  provinceCode: AmphoeCapableProvinceCode
): ProvinceAmphoeDistrict[] {
  switch (provinceCode) {
    case 'lamphun':
      return LAMPHUN_AMPHOE_MAP_DISTRICTS as ProvinceAmphoeDistrict[];
    case 'chon-buri':
      return CHON_BURI_AMPHOE_MAP_DISTRICTS as ProvinceAmphoeDistrict[];
    case 'chiang-mai':
      return AMPHOE_MAP_DISTRICTS.filter((d) => d.id !== 'other') as ProvinceAmphoeDistrict[];
  }
}

export function getAmphoeByAmpCodeForProvince(
  provinceCode: AmphoeCapableProvinceCode,
  ampCode: string
): ProvinceAmphoeDistrict | undefined {
  switch (provinceCode) {
    case 'lamphun':
      return getLamphunAmphoeByAmpCode(ampCode) as ProvinceAmphoeDistrict | undefined;
    case 'chon-buri':
      return getChonBuriAmphoeByAmpCode(ampCode) as ProvinceAmphoeDistrict | undefined;
    case 'chiang-mai':
      return getAmphoeByAmpCode(ampCode) as ProvinceAmphoeDistrict | undefined;
  }
}

export function getAmphoeByIdForProvince(
  provinceCode: AmphoeCapableProvinceCode,
  id: string
): ProvinceAmphoeDistrict | undefined {
  switch (provinceCode) {
    case 'lamphun':
      return getLamphunAmphoeById(id) as ProvinceAmphoeDistrict | undefined;
    case 'chon-buri':
      return getChonBuriAmphoeById(id) as ProvinceAmphoeDistrict | undefined;
    case 'chiang-mai':
      return getAmphoeById(id as never) as ProvinceAmphoeDistrict | undefined;
  }
}

/** Chiang Mai “other / not listed” row — Lamphun and Chon Buri have no equivalent. */
export function getOtherAmphoeForProvince(
  provinceCode: AmphoeCapableProvinceCode
): AmphoeFeeSource | null {
  if (provinceCode === 'chiang-mai') return AMPHOE_MAP_OTHER;
  return null;
}
