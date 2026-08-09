/**
 * Amphoe drill-down helpers for national province map side panels.
 */

import type { AmphoeCapableProvinceCode } from '@/lib/delivery/amphoeProvinces';
import {
  destinationIdForAmphoeProvince,
  getAmphoeDistrictsForProvince,
  type ProvinceAmphoeDistrict,
} from '@/lib/delivery/amphoeProvinces';
import { findZoneDef } from '@/lib/delivery/zones';
import type { Locale } from '@/lib/i18n';
import {
  formatAmphoeFeeDisplay,
  resolveAmphoeFeeDisplay,
} from '@/lib/delivery/amphoeDisplayFees';
import type { AmphoeMapId } from '@/lib/delivery/amphoeMapData';

/** Extra tambon / locality zones nested under a Chiang Mai amphoe. */
const CHIANG_MAI_AMPHOE_SUBZONE_IDS: Partial<Record<AmphoeMapId, string[]>> = {
  'mueang-chiang-mai': [
    'cm-mueang-central',
    'cm-chang-phueak',
    'cm-suthep',
    'cm-nong-pa-khrang',
    'cm-mueang-non-central',
  ],
  'mae-rim': ['cm-mae-rim', 'cm-don-kaeo'],
  'hang-dong': ['cm-hang-dong', 'cm-mae-hia'],
  'san-sai': ['cm-san-sai', 'cm-nong-chom'],
};

export type AmphoeSubArea = {
  zoneId: string;
  labelEn: string;
  labelTh: string;
  feeThb: number | null;
  manualQuote?: boolean;
};

export type AmphoeDrillItem = {
  amphoe: ProvinceAmphoeDistrict;
  feeLabel: string;
  subAreas: AmphoeSubArea[];
};

function subAreasForAmphoe(
  provinceCode: AmphoeCapableProvinceCode,
  amphoe: ProvinceAmphoeDistrict
): AmphoeSubArea[] {
  const destinationId = destinationIdForAmphoeProvince(provinceCode);
  const zoneIds =
    (provinceCode === 'chiang-mai'
      ? CHIANG_MAI_AMPHOE_SUBZONE_IDS[amphoe.id as AmphoeMapId]
      : undefined) ??
    (amphoe.relatedCheckoutZoneIds?.length
      ? amphoe.relatedCheckoutZoneIds
      : amphoe.checkoutZoneId
        ? [amphoe.checkoutZoneId]
        : []);

  if (zoneIds.length <= 1) return [];

  return zoneIds.map((zoneId) => {
    const def = findZoneDef(destinationId, zoneId);
    return {
      zoneId,
      labelEn: def?.labelEn ?? zoneId,
      labelTh: def?.labelTh ?? zoneId,
      feeThb: def?.feeThb ?? null,
      manualQuote: def?.manualQuote,
    };
  });
}

export function getAmphoeDrillItems(
  provinceCode: AmphoeCapableProvinceCode,
  lang: Locale
): AmphoeDrillItem[] {
  const feeLang = lang === 'th' ? 'th' : 'en';
  const destinationId = destinationIdForAmphoeProvince(provinceCode);
  return getAmphoeDistrictsForProvince(provinceCode).map((amphoe) => {
    const fee = resolveAmphoeFeeDisplay(amphoe, destinationId);
    return {
      amphoe,
      feeLabel: formatAmphoeFeeDisplay(fee, feeLang),
      subAreas: subAreasForAmphoe(provinceCode, amphoe),
    };
  });
}

/** @deprecated Prefer getAmphoeDrillItems('chiang-mai', lang) */
export function getChiangMaiAmphoeDrillItems(lang: Locale): AmphoeDrillItem[] {
  return getAmphoeDrillItems('chiang-mai', lang);
}

export type ChiangMaiSubArea = AmphoeSubArea;
export type ChiangMaiAmphoeDrillItem = AmphoeDrillItem;
