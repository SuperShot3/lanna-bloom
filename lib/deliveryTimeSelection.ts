import { addDaysToYmd, DELIVERY_SHOP_TIMEZONE, getBangkokYmd } from '@/lib/deliveryHours';

/** Four delivery windows from 09:00 to 20:00 (Bangkok). */
export const DELIVERY_TIME_SLOTS = [
  '09:00–12:00',
  '12:00–15:00',
  '15:00–18:00',
  '18:00–20:00',
] as const;

export type DeliveryTimeSlot = (typeof DELIVERY_TIME_SLOTS)[number];

/** Minimum lead time before a specific delivery time (minutes). */
export const DELIVERY_MIN_LEAD_MINUTES = 60;

const SHOP_OPEN_MIN = 9 * 60;
/** Half-open: includes 09:00, excludes 20:00. */
const SHOP_CLOSE_MIN = 20 * 60;

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

function isWithinShopHours(minutes: number): boolean {
  return minutes >= SHOP_OPEN_MIN && minutes < SHOP_CLOSE_MIN;
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

export function isSpecificDeliveryTimeSelectableForDate(
  deliveryDate: string,
  hm: string,
  now: Date = new Date()
): boolean {
  if (!deliveryDate || !hm) return false;
  const minutes = parseSpecificDeliveryTimeMinutes(hm);
  if (minutes === null) return false;
  if (!isWithinShopHours(minutes)) return false;
  return minutes >= getMinSpecificDeliveryMinutesForDate(deliveryDate, now);
}

export function isDeliveryTimeSlotSelectableForDate(
  deliveryDate: string,
  slot: string,
  now: Date = new Date()
): boolean {
  if (!deliveryDate || !slot) return true;

  if (isSpecificDeliveryTime(slot)) {
    return isSpecificDeliveryTimeSelectableForDate(deliveryDate, slot, now);
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
  now: Date = new Date()
): DeliveryTimeSlot[] {
  return DELIVERY_TIME_SLOTS.filter((slot) =>
    isDeliveryTimeSlotSelectableForDate(deliveryDate, slot, now)
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
};

/** Prefer today; if no windows remain, use tomorrow with the first selectable slot. */
export function getEarliestSelectableDeliverySchedule(
  todayYmd: string,
  now: Date = new Date()
): DeliverySchedule {
  const todaySlots = getSelectableDeliveryTimeSlotsForDate(todayYmd, now);
  if (todaySlots.length > 0) {
    return { date: todayYmd, timeSlot: todaySlots[0] };
  }
  const tomorrowYmd = addDaysToYmd(todayYmd, 1);
  const tomorrowSlots = getSelectableDeliveryTimeSlotsForDate(tomorrowYmd, now);
  return {
    date: tomorrowYmd,
    timeSlot: tomorrowSlots[0] ?? DELIVERY_TIME_SLOTS[0],
  };
}

/** Keep valid user choices; fill empty or expired date/time with the earliest schedule. */
export function resolveDeliverySchedule(
  schedule: { date: string; timeSlot: string },
  todayYmd: string,
  now: Date = new Date()
): DeliverySchedule {
  const { date, timeSlot } = schedule;

  if (date && timeSlot && isDeliveryTimeSlotSelectableForDate(date, timeSlot, now)) {
    return { date, timeSlot };
  }

  if (date) {
    const slots = getSelectableDeliveryTimeSlotsForDate(date, now);
    if (slots.length > 0) {
      return { date, timeSlot: slots[0] };
    }
  }

  return getEarliestSelectableDeliverySchedule(todayYmd, now);
}
