import {
  addDaysToYmd,
  DELIVERY_SHOP_TIMEZONE,
  DELIVERY_WINDOW_END_MIN,
  DELIVERY_WINDOW_START_MIN,
  getBangkokYmd,
} from '@/lib/deliveryHours';
import type { DeliveryConstraint } from '@/lib/delivery/deliveryConstraints';

export const ANYTIME_DELIVERY_SLOT = '09:00–20:00';
export const MORNING_DELIVERY_SLOT = '09:00–12:00';
export const MIDDAY_DELIVERY_SLOT = '12:00–15:00';
export const AFTERNOON_DELIVERY_SLOT = '15:00–18:00';
export const EVENING_DELIVERY_SLOT = '18:00–20:00';

/** All persisted windows from 09:00 to 20:00 (Bangkok). Any time is first so it is the default. */
export const DELIVERY_TIME_SLOTS = [
  ANYTIME_DELIVERY_SLOT,
  MORNING_DELIVERY_SLOT,
  MIDDAY_DELIVERY_SLOT,
  AFTERNOON_DELIVERY_SLOT,
  EVENING_DELIVERY_SLOT,
] as const;

export type DeliveryTimeSlot = (typeof DELIVERY_TIME_SLOTS)[number];

/** Customer-facing checkout chips / dropdowns (excludes unused 18:00–20:00 evening slot). */
export const CHECKOUT_WINDOW_SLOTS = [
  ANYTIME_DELIVERY_SLOT,
  MORNING_DELIVERY_SLOT,
  MIDDAY_DELIVERY_SLOT,
  AFTERNOON_DELIVERY_SLOT,
] as const;

/** Minimum lead time before a specific delivery time (minutes). */
export const DELIVERY_MIN_LEAD_MINUTES = 60;

const SHOP_OPEN_MIN = DELIVERY_WINDOW_START_MIN;
/** Half-open: includes shop open, excludes 20:00. */
const SHOP_CLOSE_MIN = DELIVERY_WINDOW_END_MIN;

const SPECIFIC_TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function minutesSinceMidnightBangkok(date: Date): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: DELIVERY_SHOP_TIMEZONE,
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }).formatToParts(date);

  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? '0');
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? '0');
  return hour * 60 + minute;
}

export function isWindowDeliveryTimeSlot(slot: string): slot is DeliveryTimeSlot {
  return DELIVERY_TIME_SLOTS.includes(slot as DeliveryTimeSlot);
}

export function isSpecificDeliveryTime(slot: string): boolean {
  return SPECIFIC_TIME_RE.test(slot.trim());
}

export function parseSpecificDeliveryTimeMinutes(slot: string): number | null {
  const match = slot.trim().match(SPECIFIC_TIME_RE);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

export function formatDeliveryTimeMinutes(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function slotStartMinutes(slot: string): number | null {
  const start = slot.split('–')[0]?.trim();
  const match = start?.match(/^(\d{2}):(\d{2})$/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

export function slotEndMinutes(slot: string): number | null {
  const end = slot.split('–')[1]?.trim();
  const match = end?.match(/^(\d{2}):(\d{2})$/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

export function getMinSpecificDeliveryMinutesForDate(
  deliveryDate: string,
  now: Date = new Date()
): number {
  if (!deliveryDate) return SHOP_OPEN_MIN;
  if (deliveryDate !== getBangkokYmd(now)) return SHOP_OPEN_MIN;
  return Math.max(SHOP_OPEN_MIN, minutesSinceMidnightBangkok(now) + DELIVERY_MIN_LEAD_MINUTES);
}

export function getMinSpecificDeliveryTimeForDate(
  deliveryDate: string,
  now: Date = new Date()
): string {
  return formatDeliveryTimeMinutes(getMinSpecificDeliveryMinutesForDate(deliveryDate, now));
}

export function getMaxSpecificDeliveryTime(): string {
  return '19:59';
}

function constraintBlocksDate(
  deliveryDate: string,
  constraint?: DeliveryConstraint | null
): boolean {
  if (!constraint) return false;
  if (!constraint.orderingAllowed) return true;
  if (constraint.earliestYmd && deliveryDate < constraint.earliestYmd) return true;
  return false;
}

/** Reject calendar dates before today in Chiang Mai (optional province/product floor). */
export function isDeliveryDateSelectable(
  deliveryDate: string,
  now: Date = new Date(),
  constraint?: DeliveryConstraint | null
): boolean {
  if (!deliveryDate || !/^\d{4}-\d{2}-\d{2}$/.test(deliveryDate)) return false;
  if (constraintBlocksDate(deliveryDate, constraint)) return false;
  return deliveryDate >= getBangkokYmd(now);
}

export function isDateAllowedUnderConstraint(
  deliveryDate: string,
  constraint: DeliveryConstraint | null | undefined,
  now: Date = new Date()
): boolean {
  return isDeliveryDateSelectable(deliveryDate, now, constraint);
}

export function isSpecificDeliveryTimeSelectableForDate(
  deliveryDate: string,
  hm: string,
  now: Date = new Date(),
  constraint?: DeliveryConstraint | null
): boolean {
  return getSpecificDeliveryTimeInvalidReason(deliveryDate, hm, now, constraint) === null;
}

export type SpecificDeliveryTimeInvalidReason =
  | 'date_blocked'
  | 'before_open'
  | 'after_hours'
  | 'too_soon';

/** Why a custom HH:mm is not allowed (null = ok). */
export function getSpecificDeliveryTimeInvalidReason(
  deliveryDate: string,
  hm: string,
  now: Date = new Date(),
  constraint?: DeliveryConstraint | null
): SpecificDeliveryTimeInvalidReason | null {
  if (!deliveryDate || !hm) return 'too_soon';
  if (!isDeliveryDateSelectable(deliveryDate, now, constraint)) return 'date_blocked';
  const minutes = parseSpecificDeliveryTimeMinutes(hm);
  if (minutes === null) return 'too_soon';
  if (minutes < SHOP_OPEN_MIN) return 'before_open';
  if (minutes >= SHOP_CLOSE_MIN) return 'after_hours';
  const minMinutes = getMinSpecificDeliveryMinutesForDate(deliveryDate, now);
  if (minutes < minMinutes) return 'too_soon';
  return null;
}

export function isDeliveryTimeSlotSelectableForDate(
  deliveryDate: string,
  slot: string,
  now: Date = new Date(),
  constraint?: DeliveryConstraint | null
): boolean {
  if (!deliveryDate || !slot) return true;
  if (!isDeliveryDateSelectable(deliveryDate, now, constraint)) return false;

  if (isSpecificDeliveryTime(slot)) {
    return isSpecificDeliveryTimeSelectableForDate(deliveryDate, slot, now, constraint);
  }

  if (!isWindowDeliveryTimeSlot(slot)) return false;
  if (deliveryDate !== getBangkokYmd(now)) return true;

  const endMinutes = slotEndMinutes(slot);
  if (endMinutes === null) return false;
  const earliestDelivery = minutesSinceMidnightBangkok(now) + DELIVERY_MIN_LEAD_MINUTES;
  return earliestDelivery < endMinutes;
}

export function getSelectableDeliveryTimeSlotsForDate(
  deliveryDate: string,
  now: Date = new Date(),
  constraint?: DeliveryConstraint | null
): DeliveryTimeSlot[] {
  return DELIVERY_TIME_SLOTS.filter((slot) =>
    isDeliveryTimeSlotSelectableForDate(deliveryDate, slot, now, constraint)
  );
}

/** Up to four on-the-hour suggestions for exact delivery time (>= 1 h from now). */
export function getSuggestedSpecificDeliveryTimes(
  deliveryDate: string,
  now: Date = new Date(),
  count = 4
): string[] {
  if (!deliveryDate) return [];

  let startMin = getMinSpecificDeliveryMinutesForDate(deliveryDate, now);
  if (startMin % 60 !== 0) {
    startMin = Math.ceil(startMin / 60) * 60;
  }

  const suggestions: string[] = [];
  for (let m = startMin; m < SHOP_CLOSE_MIN && suggestions.length < count; m += 60) {
    suggestions.push(formatDeliveryTimeMinutes(m));
  }
  return suggestions;
}

export type DeliverySchedule = {
  date: string;
  timeSlot: string;
  deliveryTimeMode?: 'window' | 'custom';
};

/** Prefer today (or constraint floor); if no windows remain, walk forward for a slot. */
export function getEarliestSelectableDeliverySchedule(
  todayYmd: string,
  now: Date = new Date(),
  constraint?: DeliveryConstraint | null
): DeliverySchedule {
  if (constraint && !constraint.orderingAllowed) {
    const fallback = constraint.earliestYmd ?? addDaysToYmd(todayYmd, 1);
    return {
      date: fallback,
      timeSlot: DELIVERY_TIME_SLOTS[0],
      deliveryTimeMode: 'window',
    };
  }

  let startYmd = todayYmd;
  if (constraint?.earliestYmd && constraint.earliestYmd > startYmd) {
    startYmd = constraint.earliestYmd;
  }

  for (let i = 0; i < 14; i++) {
    const ymd = addDaysToYmd(startYmd, i);
    const slots = getSelectableDeliveryTimeSlotsForDate(ymd, now, constraint);
    if (slots.length > 0) {
      return { date: ymd, timeSlot: slots[0], deliveryTimeMode: 'window' };
    }
  }

  return {
    date: startYmd,
    timeSlot: DELIVERY_TIME_SLOTS[0],
    deliveryTimeMode: 'window',
  };
}

/** Keep valid user choices; fill empty or expired date/time with the earliest schedule. */
export function resolveDeliverySchedule(
  schedule: { date: string; timeSlot: string; deliveryTimeMode?: 'window' | 'custom' },
  todayYmd: string,
  now: Date = new Date(),
  constraint?: DeliveryConstraint | null
): DeliverySchedule {
  const { date, timeSlot, deliveryTimeMode } = schedule;

  if (date && !isDeliveryDateSelectable(date, now, constraint)) {
    return getEarliestSelectableDeliverySchedule(todayYmd, now, constraint);
  }

  if (
    deliveryTimeMode === 'custom' &&
    date &&
    isDeliveryDateSelectable(date, now, constraint) &&
    (!timeSlot || isSpecificDeliveryTime(timeSlot))
  ) {
    // Keep empty or any typed HH:mm (including currently invalid) so the UI can
    // show why the time is wrong; checkout still rejects non-selectable slots.
    return { date, timeSlot, deliveryTimeMode: 'custom' };
  }

  if (date && timeSlot && isDeliveryTimeSlotSelectableForDate(date, timeSlot, now, constraint)) {
    return {
      date,
      timeSlot,
      deliveryTimeMode: isSpecificDeliveryTime(timeSlot) ? 'custom' : 'window',
    };
  }

  if (date && isDeliveryDateSelectable(date, now, constraint)) {
    const slots = getSelectableDeliveryTimeSlotsForDate(date, now, constraint);
    if (slots.length > 0) {
      return { date, timeSlot: slots[0], deliveryTimeMode: 'window' };
    }
  }

  return getEarliestSelectableDeliverySchedule(todayYmd, now, constraint);
}

/** Parse `"YYYY-MM-DD HH:mm"` or `"YYYY-MM-DD 09:00–12:00"` from checkout payload. */
export function parsePreferredTimeSlot(
  value: string
): { date: string; time: string } | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/^(\d{4}-\d{2}-\d{2})\s+(.+)$/);
  if (!match) return null;
  const time = match[2].trim();
  if (!time) return null;
  return { date: match[1], time };
}

export function isPreferredTimeSlotValid(
  value: string,
  now: Date = new Date(),
  constraint?: DeliveryConstraint | null
): boolean {
  const parsed = parsePreferredTimeSlot(value);
  if (!parsed) return false;
  return isDeliveryTimeSlotSelectableForDate(parsed.date, parsed.time, now, constraint);
}

export function isPreferredTimeSlotValidUnderConstraint(
  value: string,
  constraint: DeliveryConstraint | null | undefined,
  now: Date = new Date()
): boolean {
  return isPreferredTimeSlotValid(value, now, constraint);
}
