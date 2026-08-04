import {
  PROVINCE_STATUSES,
  SEO_PAGE_STATUSES,
  type ProvinceStatus,
  type ProvinceUpdateInput,
  type SeoPageStatus,
} from './types';

const CUTOFF_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function isProvinceStatus(v: unknown): v is ProvinceStatus {
  return typeof v === 'string' && (PROVINCE_STATUSES as readonly string[]).includes(v);
}

export function isSeoPageStatus(v: unknown): v is SeoPageStatus {
  return typeof v === 'string' && (SEO_PAGE_STATUSES as readonly string[]).includes(v);
}

export function isValidSameDayCutoff(v: unknown): v is string {
  return typeof v === 'string' && CUTOFF_RE.test(v);
}

export type ProvinceValidationResult =
  | { ok: true; patch: ProvinceUpdateInput }
  | { ok: false; error: string };

/**
 * Validate admin PATCH body against Feature 1 rules:
 * - catalog_enabled cannot be true when status is coming_soon
 * - same_day_cutoff_local only accepted when status is same_day
 */
export function validateProvinceUpdate(
  body: unknown,
  current: { status: ProvinceStatus; catalog_enabled: boolean }
): ProvinceValidationResult {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'Invalid request body' };
  }

  const raw = body as Record<string, unknown>;
  const patch: ProvinceUpdateInput = {};

  if ('status' in raw) {
    if (!isProvinceStatus(raw.status)) {
      return { ok: false, error: 'Invalid status' };
    }
    patch.status = raw.status;
  }

  if ('catalog_enabled' in raw) {
    if (typeof raw.catalog_enabled !== 'boolean') {
      return { ok: false, error: 'catalog_enabled must be a boolean' };
    }
    patch.catalog_enabled = raw.catalog_enabled;
  }

  if ('min_advance_notice_hours' in raw) {
    const v = raw.min_advance_notice_hours;
    if (v === null) {
      patch.min_advance_notice_hours = null;
    } else if (typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= 24 * 14) {
      patch.min_advance_notice_hours = v;
    } else {
      return { ok: false, error: 'min_advance_notice_hours must be an integer 0–336 or null' };
    }
  }

  if ('same_day_cutoff_local' in raw) {
    const v = raw.same_day_cutoff_local;
    if (v === null || v === '') {
      patch.same_day_cutoff_local = null;
    } else if (isValidSameDayCutoff(v)) {
      patch.same_day_cutoff_local = v;
    } else {
      return { ok: false, error: 'same_day_cutoff_local must be HH:MM (24h) or null' };
    }
  }

  for (const key of [
    'customer_message_en',
    'customer_message_th',
    'delivery_limitations_en',
    'delivery_limitations_th',
    'internal_notes',
  ] as const) {
    if (key in raw) {
      const v = raw[key];
      if (v === null) {
        patch[key] = null;
      } else if (typeof v === 'string') {
        if (v.length > 4000) {
          return { ok: false, error: `${key} is too long` };
        }
        patch[key] = v;
      } else {
        return { ok: false, error: `${key} must be a string or null` };
      }
    }
  }

  if ('available_categories' in raw) {
    const v = raw.available_categories;
    if (v === null) {
      patch.available_categories = null;
    } else if (
      Array.isArray(v) &&
      v.every((x) => typeof x === 'string' && x.length > 0 && x.length <= 80)
    ) {
      if (v.length > 40) {
        return { ok: false, error: 'available_categories is too long' };
      }
      patch.available_categories = v as string[];
    } else {
      return { ok: false, error: 'available_categories must be a string array or null' };
    }
  }

  if ('seo_page_status' in raw) {
    if (!isSeoPageStatus(raw.seo_page_status)) {
      return { ok: false, error: 'Invalid seo_page_status' };
    }
    patch.seo_page_status = raw.seo_page_status;
  }

  if ('destination_id' in raw) {
    return {
      ok: false,
      error: 'destination_id cannot be changed via admin; it requires a code change',
    };
  }

  const nextStatus = patch.status ?? current.status;
  const nextCatalog = patch.catalog_enabled ?? current.catalog_enabled;

  if (nextCatalog && nextStatus === 'coming_soon') {
    return {
      ok: false,
      error: 'catalog_enabled cannot be true when status is coming_soon',
    };
  }

  if (patch.same_day_cutoff_local != null && nextStatus !== 'same_day') {
    return {
      ok: false,
      error: 'same_day_cutoff_local is only allowed when status is same_day',
    };
  }

  // Clear cutoff when leaving same_day so stale values don't linger.
  if (patch.status && patch.status !== 'same_day' && !('same_day_cutoff_local' in patch)) {
    patch.same_day_cutoff_local = null;
  }

  if (Object.keys(patch).length === 0) {
    return { ok: false, error: 'No updatable fields provided' };
  }

  return { ok: true, patch };
}

export function toPublicProvince<T extends Record<string, unknown>>(row: T) {
  return {
    province_code: row.province_code as string,
    province_name_en: row.province_name_en as string,
    province_name_th: row.province_name_th as string,
    topojson_property_value: (row.topojson_property_value as string | null) ?? null,
    status: row.status as ProvinceStatus,
    catalog_enabled: Boolean(row.catalog_enabled),
    min_advance_notice_hours:
      typeof row.min_advance_notice_hours === 'number' ? row.min_advance_notice_hours : null,
    same_day_cutoff_local: (row.same_day_cutoff_local as string | null) ?? null,
    customer_message_en: (row.customer_message_en as string | null) ?? null,
    customer_message_th: (row.customer_message_th as string | null) ?? null,
    delivery_limitations_en: (row.delivery_limitations_en as string | null) ?? null,
    delivery_limitations_th: (row.delivery_limitations_th as string | null) ?? null,
    available_categories: Array.isArray(row.available_categories)
      ? (row.available_categories as string[])
      : null,
  };
}
