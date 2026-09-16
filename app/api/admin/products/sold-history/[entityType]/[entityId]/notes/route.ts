import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/adminRbac';
import { createCatalogAuditEvent } from '@/lib/catalogCms';
import { getSupabaseAdmin } from '@/lib/supabase/server';

const MAX_SOLD_HISTORY_NOTES_LENGTH = 2000;

type EntityType = 'bouquet' | 'product';

function parseEntityType(value: string): EntityType | null {
  return value === 'bouquet' || value === 'product' ? value : null;
}

function parseNotes(body: unknown): string | null | undefined {
  if (typeof body !== 'object' || body === null || !('sold_history_notes' in body)) {
    return undefined;
  }
  const raw = (body as { sold_history_notes?: unknown }).sold_history_notes;
  if (raw === null) return null;
  if (typeof raw !== 'string') return undefined;
  const trimmed = raw.trim();
  return trimmed || null;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ entityType: string; entityId: string }> }
) {
  const authResult = await requireRole(['OWNER', 'MANAGER']);
  if (!authResult.ok) return authResult.response;
  const { session } = authResult;

  const { entityType: rawEntityType, entityId: rawEntityId } = await params;
  const entityType = parseEntityType(rawEntityType);
  const entityId = rawEntityId?.trim();
  if (!entityType || !entityId) {
    return NextResponse.json({ error: 'Invalid entityType or entityId' }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const notes = parseNotes(body);
  if (notes === undefined) {
    return NextResponse.json(
      { error: 'sold_history_notes must be a string or null' },
      { status: 400 }
    );
  }
  if (notes && notes.length > MAX_SOLD_HISTORY_NOTES_LENGTH) {
    return NextResponse.json(
      { error: `sold_history_notes must be ${MAX_SOLD_HISTORY_NOTES_LENGTH} characters or fewer` },
      { status: 400 }
    );
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
  }

  const table = entityType === 'product' ? 'catalog_products' : 'catalog_bouquets';

  const { data: existing, error: fetchError } = await supabase
    .from(table)
    .select('id, sold_history_notes')
    .eq('id', entityId)
    .maybeSingle();

  if (fetchError || !existing) {
    return NextResponse.json({ error: `${entityType} not found` }, { status: 404 });
  }

  const { data: updated, error } = await supabase
    .from(table)
    .update({ sold_history_notes: notes, updated_at: new Date().toISOString() })
    .eq('id', entityId)
    .select('id, sold_history_notes')
    .single();

  if (error) {
    console.error('[admin] sold history notes update error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await createCatalogAuditEvent({
    entityType,
    entityId,
    action: 'sold_history_notes_update',
    actor: session.user.email ?? 'unknown',
    beforeSummary: { sold_history_notes: existing.sold_history_notes ?? null },
    afterSummary: { sold_history_notes: notes },
  });

  revalidatePath('/admin/products/sold-history');

  return NextResponse.json({ ok: true, product: updated });
}
