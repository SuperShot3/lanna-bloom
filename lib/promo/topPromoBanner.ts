import { getActiveAdvancePeakPromo } from '@/lib/promo/advancePeakPromoCatalog';
import { isMay2026FreeDeliveryActive } from '@/lib/promo/campaigns';
import {
  getActivePeakCelebrationNotice,
  getActivePeakCelebrationSpike,
} from '@/lib/promo/peakCelebrationPricing';

export type TopPromoBannerKind = 'advance' | 'peak' | 'may' | null;

/** Same priority as MainSiteChrome: advance peak → peak notice → May free delivery. */
export function getActiveTopPromoBannerKind(
  now: Date = new Date()
): TopPromoBannerKind {
  if (getActiveAdvancePeakPromo(now)) return 'advance';
  if (getActivePeakCelebrationSpike(now) || getActivePeakCelebrationNotice(now)) {
    return 'peak';
  }
  if (isMay2026FreeDeliveryActive(now)) return 'may';
  return null;
}

export function isTopPromoBannerActive(now: Date = new Date()): boolean {
  return getActiveTopPromoBannerKind(now) != null;
}
