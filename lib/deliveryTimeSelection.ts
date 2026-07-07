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

/** Reject calendar dates before today in Chiang Mai. */
export function isDeliveryDateSelectable(
  deliveryDate: string,
  now: Date = new Date()
): boolean {
  if (!deliveryDate || !/^\d{4}-\d{2}-\d{2}$/.test(deliveryDate)) return false;
  return deliveryDate >= getBangkokYmd(now);
}

export function isSpecificDeliveryTimeSelectableForDate(
  deliveryDate: string,
  hm: string,
  now: Date = new Date()
): boolean {
  if (!deliveryDate || !hm) return false;
  if (!isDeliveryDateSelectable(deliveryDate, now)) return false;
  const minutes = parseSpecificDeliveryTimeMinutes(hm);
  if (minutes === null) return false;
  if (minutes < SHOP_OPEN_MIN || minutes >= SHOP_CLOSE_MIN) return false;
  const minMinutes = getMinSpecificDeliveryMinutesForDate(deliveryDate, now);
  return minutes >= minMinutes;
}

export function isDeliveryTimeSlotSelectableForDate(
  deliveryDate: string,
  slot: string,
  now: Date = new Date()
): boolean {
  if (!deliveryDate || !slot) return true;
  if (!isDeliveryDateSelectable(deliveryDate, now)) return false;

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
  deliveryTimeMode?: 'window' | 'custom';
};

/** Prefer today; if no windows remain, use tomorrow with the first selectable slot. */
export function getEarliestSelectableDeliverySchedule(
  todayYmd: string,
  now: Date = new Date()
): DeliverySchedule {
  const todaySlots = getSelectableDeliveryTimeSlotsForDate(todayYmd, now);
  if (todaySlots.length > 0) {
    return { date: todayYmd, timeSlot: todaySlots[0], deliveryTimeMode: 'window' };
  }
  const tomorrowYmd = addDaysToYmd(todayYmd, 1);
  const tomorrowSlots = getSelectableDeliveryTimeSlotsForDate(tomorrowYmd, now);
  return {
    date: tomorrowYmd,
    timeSlot: tomorrowSlots[0] ?? DELIVERY_TIME_SLOTS[0],
    deliveryTimeMode: 'window',
  };
}

/** Keep valid user choices; fill empty or expired date/time with the earliest schedule. */
export function resolveDeliverySchedule(
  schedule: { date: string; timeSlot: string; deliveryTimeMode?: 'window' | 'custom' },
  todayYmd: string,
  now: Date = new Date()
): DeliverySchedule {
  const { date, timeSlot, deliveryTimeMode } = schedule;

  if (date && !isDeliveryDateSelectable(date, now)) {
    return getEarliestSelectableDeliverySchedule(todayYmd, now);
  }

  if (
    deliveryTimeMode === 'custom' &&
    date &&
    isDeliveryDateSelectable(date, now) &&
    (!timeSlot || isSpecificDeliveryTime(timeSlot))
  ) {
    if (timeSlot && isDeliveryTimeSlotSelectableForDate(date, timeSlot, now)) {
      return { date, timeSlot, deliveryTimeMode: 'custom' };
    }
    return { date, timeSlot: '', deliveryTimeMode: 'custom' };
  }

  if (date && timeSlot && isDeliveryTimeSlotSelectableForDate(date, timeSlot, now)) {
    return {
      date,
      timeSlot,
      deliveryTimeMode: isSpecificDeliveryTime(timeSlot) ? 'custom' : 'window',
    };
  }

  if (date && isDeliveryDateSelectable(date, now)) {
    const slots = getSelectableDeliveryTimeSlotsForDate(date, now);
    if (slots.length > 0) {
      return { date, timeSlot: slots[0], deliveryTimeMode: 'window' };
    }
  }

  return getEarliestSelectableDeliverySchedule(todayYmd, now);
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

export function isPreferredTimeSlotValid(value: string, now: Date = new Date()): boolean {
  const parsed = parsePreferredTimeSlot(value);
  if (!parsed) return false;
  return isDeliveryTimeSlotSelectableForDate(parsed.date, parsed.time, now);
}
