import type { LineDraftPayload, LineDraftCartItem } from './types';
import { validateCatalogItemRef } from '@/lib/line-catalog/searchCatalog';

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}

function isCartItemShape(v: unknown): v is LineDraftCartItem {
  if (!v || typeof v !== 'object') return false;
  const i = v as Record<string, unknown>;
  if (!isNonEmptyString(i.bouquetId) || !isNonEmptyString(i.slug)) return false;
  if (typeof i.nameEn !== 'string' || typeof i.nameTh !== 'string') return false;
  if (!i.size || typeof i.size !== 'object') return false;
  const sz = i.size as Record<string, unknown>;
  if (!isNonEmptyString(sz.key)) return false;
  if (typeof sz.price !== 'number' || Number.isNaN(sz.price)) return false;
  if (!i.addOns || typeof i.addOns !== 'object') return false;
  return true;
}

export function parseLineDraftPayload(body: unknown): { ok: true; draft: LineDraftPayload } | { ok: false; message: string } {
  if (!body || typeof body !== 'object') {
    return { ok: false, message: 'Invalid draft body' };
  }
  const b = body as Record<string, unknown>;
  const items = b.items;
  if (!Array.isArray(items) || items.length === 0) {
    return { ok: false, message: 'draft.items must be a non-empty array' };
  }
  for (const it of items) {
    if (!isCartItemShape(it)) {
      return { ok: false, message: 'Invalid draft item (need bouquetId, slug, size.key, size.price, addOns)' };
    }
    const refCheck = validateCatalogItemRef({
      id: it.bouquetId,
      slug: it.slug,
    });
    if (!refCheck.ok) {
      return { ok: false, message: `Invalid draft item (not in website catalog): ${refCheck.message}` };
    }
  }

  const draft: LineDraftPayload = {
    items: items as LineDraftCartItem[],
    ...(typeof b.form === 'object' && b.form !== null ? { form: b.form as LineDraftPayload['form'] } : {}),
    ...(b.lang === 'th' || b.lang === 'en' ? { lang: b.lang } : {}),
  };

  return { ok: true, draft };
}
