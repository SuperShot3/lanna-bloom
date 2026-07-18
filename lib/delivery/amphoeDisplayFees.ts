/**
 * Derive amphoe / map display fees from checkout zones (zones.ts).
 * Never hardcode fee amounts here — getZoneFee is authoritative.
 */

import { feeTierFillColor, formatFeeRange } from '@/lib/delivery/distanceTiers';
import { getZoneFee } from '@/lib/delivery/zones';

export type AmphoeFeeDisplayKind = 'checkout' | 'driver_confirm';

export interface AmphoeFeeDisplay {
  displayKind: AmphoeFeeDisplayKind;
  feeFrom: number;
  feeTo: number | null;
  /** Primary fee for map fill color; null → driver-confirm muted fill */
  primaryFee: number | null;
}

/** Inputs needed to resolve display fees (no geometry). */
export interface AmphoeFeeSource {
  checkoutZoneId?: string;
  relatedCheckoutZoneIds?: string[];
  /** Map-only / not in checkout dropdown */
  manualQuote?: boolean;
}

const OTHER_ESTIMATE_ZONE_ID = 'cm-unknown';

function feesForZoneIds(zoneIds: string[]): number[] {
  const fees: number[] = [];
  for (const id of zoneIds) {
    const fee = getZoneFee('CHIANG_MAI', id);
    if (fee != null) fees.push(fee);
  }
  return fees;
}

/**
 * Resolve display fee for an amphoe map district from checkout zones.
 */
export function resolveAmphoeFeeDisplay(district: AmphoeFeeSource): AmphoeFeeDisplay {
  const zoneIds =
    district.relatedCheckoutZoneIds?.length
      ? district.relatedCheckoutZoneIds
      : district.checkoutZoneId
        ? [district.checkoutZoneId]
        : [];

  const fees = feesForZoneIds(zoneIds);

  if (district.manualQuote || zoneIds.length === 0 || fees.length === 0) {
    const estimate =
      fees.length > 0
        ? Math.min(...fees)
        : getZoneFee('CHIANG_MAI', OTHER_ESTIMATE_ZONE_ID) ?? 550;
    return {
      displayKind: 'driver_confirm',
      feeFrom: estimate,
      feeTo: fees.length > 1 ? Math.max(...fees) : null,
      primaryFee: null,
    };
  }

  const feeFrom = Math.min(...fees);
  const feeToMax = Math.max(...fees);
  return {
    displayKind: 'checkout',
    feeFrom,
    feeTo: feeFrom === feeToMax ? feeFrom : feeToMax,
    primaryFee: feeFrom,
  };
}

/** “My location is not listed” — estimate from cm-unknown, always driver-confirm. */
export function resolveOtherAmphoeFeeDisplay(): AmphoeFeeDisplay {
  const estimate = getZoneFee('CHIANG_MAI', OTHER_ESTIMATE_ZONE_ID) ?? 550;
  return {
    displayKind: 'driver_confirm',
    feeFrom: estimate,
    feeTo: null,
    primaryFee: null,
  };
}

export function amphoeMapFill(district: AmphoeFeeSource): string {
  const resolved = resolveAmphoeFeeDisplay(district);
  return feeTierFillColor(resolved.primaryFee);
}

export function formatAmphoeFeeDisplay(
  display: AmphoeFeeDisplay,
  lang: 'en' | 'th'
): string {
  const range = formatFeeRange(display.feeFrom, display.feeTo, lang);
  if (display.displayKind === 'driver_confirm') {
    return lang === 'th' ? `ประมาณ ${range}` : `About ${range}`;
  }
  return range;
}
