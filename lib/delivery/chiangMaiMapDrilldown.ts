/**
 * Chiang Mai–only drill-down for the national province map.
 * Amphoe polygons are drawn on ThailandProvinceMap when Chiang Mai is selected;
 * this module supplies fee labels + tambon/zone sub-areas for the overlay panel.
 */

import {
  AMPHOE_MAP_DISTRICTS,
  type AmphoeMapId,
  type AmphoeMapDistrict,
} from '@/lib/delivery/amphoeMapData';
import { findZoneDef } from '@/lib/delivery/zones';
import type { Locale } from '@/lib/i18n';
import {
  formatAmphoeFeeDisplay,
  resolveAmphoeFeeDisplay,
} from '@/lib/delivery/amphoeDisplayFees';

/** Extra tambon / locality zones nested under an amphoe (beyond the amphoe's primary zone). */
const AMPHOE_SUBZONE_IDS: Partial<Record<AmphoeMapId, string[]>> = {
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

export type ChiangMaiSubArea = {
  zoneId: string;
  labelEn: string;
  labelTh: string;
  feeThb: number | null;
  manualQuote?: boolean;
};

export type ChiangMaiAmphoeDrillItem = {
  amphoe: AmphoeMapDistrict;
  feeLabel: string;
  subAreas: ChiangMaiSubArea[];
};

function subAreasForAmphoe(amphoe: AmphoeMapDistrict): ChiangMaiSubArea[] {
  const zoneIds =
    AMPHOE_SUBZONE_IDS[amphoe.id] ??
    (amphoe.relatedCheckoutZoneIds?.length
      ? amphoe.relatedCheckoutZoneIds
      : amphoe.checkoutZoneId
        ? [amphoe.checkoutZoneId]
        : []);

  // Only expose a "sub-districts" list when there is more than one zone.
  if (zoneIds.length <= 1) return [];

  return zoneIds.map((zoneId) => {
    const def = findZoneDef('CHIANG_MAI', zoneId);
    return {
      zoneId,
      labelEn: def?.labelEn ?? zoneId,
      labelTh: def?.labelTh ?? zoneId,
      feeThb: def?.feeThb ?? null,
      manualQuote: def?.manualQuote,
    };
  });
}

export function getChiangMaiAmphoeDrillItems(lang: Locale): ChiangMaiAmphoeDrillItem[] {
  const feeLang = lang === 'th' ? 'th' : 'en';
  return AMPHOE_MAP_DISTRICTS.filter((d) => d.id !== 'other').map((amphoe) => {
    const fee = resolveAmphoeFeeDisplay(amphoe);
    return {
      amphoe,
      feeLabel: formatAmphoeFeeDisplay(fee, feeLang),
      subAreas: subAreasForAmphoe(amphoe),
    };
  });
}
