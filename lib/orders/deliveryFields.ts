/**
 * Delivery date/window mapping and admin delivery-details patch validation.
 * Shared by order create/read and admin delivery edits.
 */

import { DELIVERY_TIME_SLOTS, type DeliveryTimeSlot } from '@/lib/deliveryTimeSelection';

export const DELIVERY_WINDOWS = [
  'MORNING_9_12',
  'MIDDAY_12_15',
  'AFTERNOON_15_18',
  'EVENING_18_20',
] as const;

export type DeliveryWindow = (typeof DELIVERY_WINDOWS)[number];

const WINDOW_TO_SLOT: Record<DeliveryWindow, DeliveryTimeSlot> = {
  MORNING_9_12: '09:00–12:00',
  MIDDAY_12_15: '12:00–15:00',
  AFTERNOON_15_18: '15:00–18:00',
  EVENING_18_20: '18:00–20:00',
};

const SLOT_TO_WINDOW: Record<string, DeliveryWindow> = {
  '09:00–12:00': 'MORNING_9_12',
  '12:00–15:00': 'MIDDAY_12_15',
  '15:00–18:00': 'AFTERNOON_15_18',
  '18:00–20:00': 'EVENING_18_20',
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_ADDRESS_LEN = 500;
const MAX_NOTES_LEN = 1000;
const MAX_NAME_LEN = 120;
const MAX_PHONE_LEN = 40;
const MAX_MAPS_URL_LEN = 1000;

export type DeliveryDetailsFieldKey =
  | 'delivery_date'
  | 'delivery_window'
  | 'address'
  | 'delivery_google_maps_url'
  | 'recipient_name'
  | 'recipient_phone'
  | 'notes'
  | 'surprise_delivery';

export type DeliveryDetailsSnapshot = {
  delivery_date: string | null;
  delivery_window: DeliveryWindow | null;
  address: string | null;
  delivery_google_maps_url: string | null;
  recipient_name: string | null;
  recipient_phone: string | null;
  notes: string | null;
  surprise_delivery: boolean | null;
};

export type DeliveryDetailsPatch = Partial<{
  delivery_date: string;
  delivery_window: DeliveryWindow;
  address: string;
  delivery_google_maps_url: string | null;
  recipient_name: string | null;
  recipient_phone: string | null;
  notes: string | null;
  surprise_delivery: boolean | null;
}>;

export function isDeliveryWindow(value: string): value is DeliveryWindow {
  return (DELIVERY_WINDOWS as readonly string[]).includes(value);
}

export function deliveryWindowFromTimeSlot(slotOrPreferred: string): DeliveryWindow {
  const s = slotOrPreferred.trim();
  if (isDeliveryWindow(s)) return s;
  const mapped = SLOT_TO_WINDOW[s];
  if (mapped) return mapped;
  if (s.includes('12:00') && s.includes('15:00')) return 'MIDDAY_12_15';
  if (s.includes('15:00') && s.includes('18:00')) return 'AFTERNOON_15_18';
  if (s.includes('18:00') && s.includes('20:00')) return 'EVENING_18_20';
  return 'MORNING_9_12';
}

export function timeSlotFromDeliveryWindow(window: string | null | undefined): DeliveryTimeSlot {
  if (window && isDeliveryWindow(window)) return WINDOW_TO_SLOT[window];
  return '09:00–12:00';
}

export function preferredTimeSlotFromParts(
  date: string | null | undefined,
  window: string | null | undefined
): string {
  const d =
    date && DATE_RE.test(date.trim()) ? date.trim() : new Date().toISOString().slice(0, 10);
  return `${d} ${timeSlotFromDeliveryWindow(window)}`;
}

export function formatDeliveryWindowLabel(window: string | null | undefined): string {
  if (!window?.trim()) return '—';
  if (isDeliveryWindow(window.trim())) return WINDOW_TO_SLOT[window.trim() as DeliveryWindow];
  return window.replace(/_/g, ' ');
}

export function deliveryFieldLabel(key: DeliveryDetailsFieldKey): string {
  switch (key) {
    case 'delivery_date':
      return 'Date';
    case 'delivery_window':
      return 'Window';
    case 'address':
      return 'Address';
    case 'delivery_google_maps_url':
      return 'Google Maps';
    case 'recipient_name':
      return 'Recipient name';
    case 'recipient_phone':
      return 'Recipient phone';
    case 'notes':
      return 'Driver notes';
    case 'surprise_delivery':
      return 'Surprise delivery';
  }
}

export function formatDeliveryFieldValue(
  key: DeliveryDetailsFieldKey,
  value: string | boolean | null | undefined
): string {
  if (value === null || value === undefined || value === '') return '—';
  if (key === 'delivery_window' && typeof value === 'string') {
    return formatDeliveryWindowLabel(value);
  }
  if (key === 'surprise_delivery') {
    if (value === true) return 'Yes';
    if (value === false) return 'No';
    return '—';
  }
  return String(value);
}

function normalizeOptionalString(raw: unknown, maxLen: number): string | null | undefined {
  if (raw === undefined) return undefined;
  if (raw === null) return null;
  if (typeof raw !== 'string') return undefined;
  const trimmed = raw.trim().replace(/\s+/g, ' ');
  if (!trimmed) return null;
  if (trimmed.length > maxLen) return undefined;
  return trimmed;
}

function normalizeRequiredAddress(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const trimmed = raw.trim().replace(/\s+/g, ' ');
  if (!trimmed || trimmed.length > MAX_ADDRESS_LEN) return undefined;
  return trimmed;
}

/**
 * Parse a partial admin PATCH body. Returns `{ ok: false, error }` on invalid input.
 * Only includes keys that were present in the body.
 */
export function parseDeliveryDetailsPatch(
  body: unknown
): { ok: true; patch: DeliveryDetailsPatch } | { ok: false; error: string } {
  if (typeof body !== 'object' || body === null) {
    return { ok: false, error: 'Invalid JSON body' };
  }
  const b = body as Record<string, unknown>;
  const patch: DeliveryDetailsPatch = {};
  let any = false;

  if ('delivery_date' in b) {
    any = true;
    if (typeof b.delivery_date !== 'string' || !DATE_RE.test(b.delivery_date.trim())) {
      return { ok: false, error: 'delivery_date must be YYYY-MM-DD' };
    }
    patch.delivery_date = b.delivery_date.trim();
  }

  if ('delivery_window' in b) {
    any = true;
    const w = typeof b.delivery_window === 'string' ? b.delivery_window.trim() : '';
    if (!isDeliveryWindow(w)) {
      return {
        ok: false,
        error: `delivery_window must be one of: ${DELIVERY_WINDOWS.join(', ')}`,
      };
    }
    patch.delivery_window = w;
  }

  if ('address' in b) {
    any = true;
    const address = normalizeRequiredAddress(b.address);
    if (address === undefined) {
      return {
        ok: false,
        error: `address must be a non-empty string of at most ${MAX_ADDRESS_LEN} characters`,
      };
    }
    patch.address = address;
  }

  if ('delivery_google_maps_url' in b) {
    any = true;
    const url = normalizeOptionalString(b.delivery_google_maps_url, MAX_MAPS_URL_LEN);
    if (url === undefined) {
      return {
        ok: false,
        error: `delivery_google_maps_url must be a string or null (max ${MAX_MAPS_URL_LEN} chars)`,
      };
    }
    if (url && !/^https?:\/\//i.test(url)) {
      return { ok: false, error: 'delivery_google_maps_url must start with http:// or https://' };
    }
    patch.delivery_google_maps_url = url;
  }

  if ('recipient_name' in b) {
    any = true;
    const name = normalizeOptionalString(b.recipient_name, MAX_NAME_LEN);
    if (name === undefined) {
      return {
        ok: false,
        error: `recipient_name must be a string or null (max ${MAX_NAME_LEN} chars)`,
      };
    }
    patch.recipient_name = name;
  }

  if ('recipient_phone' in b) {
    any = true;
    if (b.recipient_phone === null) {
      patch.recipient_phone = null;
    } else if (typeof b.recipient_phone === 'string') {
      const trimmed = b.recipient_phone.trim().replace(/\s+/g, ' ');
      if (!trimmed) {
        patch.recipient_phone = null;
      } else if (trimmed.length > MAX_PHONE_LEN) {
        return { ok: false, error: `recipient_phone must be at most ${MAX_PHONE_LEN} characters` };
      } else {
        patch.recipient_phone = trimmed;
      }
    } else {
      return { ok: false, error: 'recipient_phone must be a string or null' };
    }
  }

  if ('notes' in b) {
    any = true;
    if (b.notes === null) {
      patch.notes = null;
    } else if (typeof b.notes === 'string') {
      const trimmed = b.notes.trim();
      if (!trimmed) {
        patch.notes = null;
      } else if (trimmed.length > MAX_NOTES_LEN) {
        return { ok: false, error: `notes must be at most ${MAX_NOTES_LEN} characters` };
      } else {
        patch.notes = trimmed;
      }
    } else {
      return { ok: false, error: 'notes must be a string or null' };
    }
  }

  if ('surprise_delivery' in b) {
    any = true;
    if (b.surprise_delivery === null) {
      patch.surprise_delivery = null;
    } else if (typeof b.surprise_delivery === 'boolean') {
      patch.surprise_delivery = b.surprise_delivery;
    } else {
      return { ok: false, error: 'surprise_delivery must be a boolean or null' };
    }
  }

  if (!any) {
    return { ok: false, error: 'No delivery fields provided' };
  }

  return { ok: true, patch };
}

export type DeliveryUpdateBuildResult = {
  columnUpdates: {
    delivery_date?: string | null;
    delivery_window?: string | null;
    address?: string | null;
    delivery_google_maps_url?: string | null;
    recipient_name?: string | null;
    recipient_phone?: string | null;
  };
  /** Keys under order_json.delivery to merge */
  deliveryJsonPatch: Record<string, unknown>;
  from: Partial<DeliveryDetailsSnapshot>;
  to: Partial<DeliveryDetailsSnapshot>;
  changedFields: DeliveryDetailsFieldKey[];
};

function valuesEqual(
  a: string | boolean | null | undefined,
  b: string | boolean | null | undefined
): boolean {
  return (a ?? null) === (b ?? null);
}

/**
 * Diff current snapshot against patch; only includes fields that actually change.
 */
export function buildDeliveryUpdatePayload(
  current: DeliveryDetailsSnapshot,
  patch: DeliveryDetailsPatch
): DeliveryUpdateBuildResult | { error: string } {
  const columnUpdates: DeliveryUpdateBuildResult['columnUpdates'] = {};
  const deliveryJsonPatch: Record<string, unknown> = {};
  const from: Partial<DeliveryDetailsSnapshot> = {};
  const to: Partial<DeliveryDetailsSnapshot> = {};
  const changedFields: DeliveryDetailsFieldKey[] = [];

  const markChange = <K extends DeliveryDetailsFieldKey>(
    key: K,
    next: DeliveryDetailsSnapshot[K],
    apply: () => void
  ) => {
    if (valuesEqual(current[key], next)) return;
    from[key] = current[key] as never;
    to[key] = next as never;
    changedFields.push(key);
    apply();
  };

  if (patch.delivery_date !== undefined) {
    markChange('delivery_date', patch.delivery_date, () => {
      columnUpdates.delivery_date = patch.delivery_date!;
    });
  }
  if (patch.delivery_window !== undefined) {
    markChange('delivery_window', patch.delivery_window, () => {
      columnUpdates.delivery_window = patch.delivery_window!;
    });
  }
  if (patch.address !== undefined) {
    markChange('address', patch.address, () => {
      columnUpdates.address = patch.address!;
      deliveryJsonPatch.address = patch.address!;
    });
  }
  if (patch.delivery_google_maps_url !== undefined) {
    markChange('delivery_google_maps_url', patch.delivery_google_maps_url, () => {
      columnUpdates.delivery_google_maps_url = patch.delivery_google_maps_url!;
      deliveryJsonPatch.deliveryGoogleMapsUrl = patch.delivery_google_maps_url;
    });
  }
  if (patch.recipient_name !== undefined) {
    markChange('recipient_name', patch.recipient_name, () => {
      columnUpdates.recipient_name = patch.recipient_name!;
      deliveryJsonPatch.recipientName = patch.recipient_name;
    });
  }
  if (patch.recipient_phone !== undefined) {
    markChange('recipient_phone', patch.recipient_phone, () => {
      columnUpdates.recipient_phone = patch.recipient_phone!;
      deliveryJsonPatch.recipientPhone = patch.recipient_phone;
    });
  }
  if (patch.notes !== undefined) {
    markChange('notes', patch.notes, () => {
      deliveryJsonPatch.notes = patch.notes;
    });
  }
  if (patch.surprise_delivery !== undefined) {
    markChange('surprise_delivery', patch.surprise_delivery, () => {
      deliveryJsonPatch.surpriseDelivery = patch.surprise_delivery;
    });
  }

  if (changedFields.length === 0) {
    return { error: 'No changes detected' };
  }

  // Keep preferredTimeSlot in sync whenever date or window changes.
  const nextDate =
    patch.delivery_date !== undefined ? patch.delivery_date : current.delivery_date;
  const nextWindow =
    patch.delivery_window !== undefined ? patch.delivery_window : current.delivery_window;
  if (
    changedFields.includes('delivery_date') ||
    changedFields.includes('delivery_window')
  ) {
    deliveryJsonPatch.preferredTimeSlot = preferredTimeSlotFromParts(nextDate, nextWindow);
  }

  return { columnUpdates, deliveryJsonPatch, from, to, changedFields };
}

export { DELIVERY_TIME_SLOTS };
