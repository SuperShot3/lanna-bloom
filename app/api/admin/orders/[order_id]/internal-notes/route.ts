import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/adminRbac';
import { logAudit } from '@/lib/auditLog';
import { getSupabaseAdmin } from '@/lib/supabase/server';

const MAX_INTERNAL_NOTES_LENGTH = 2000;

function parseInternalNotes(body: unknown): string | null | undefined {
  if (typeof body !== 'object' || body === null || !('internal_notes' in body)) {
    return undefined;
  }

  const raw = (body as { internal_notes?: unknown }).internal_notes;
  if (raw === null) return null;
  if (typeof raw !== 'string') return undefined;

  const trimmed = raw.trim();
  return trimmed || null;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ order_id: string }> }
) {
  const authResult = await requireRole(['OWNER', 'MANAGER']);
  if (!authResult.ok) return authResult.response;
  const { session } = authResult;

  const { order_id } = await params;
  const orderId = order_id?.trim();
  if (!orderId) {
    return NextResponse.json({ error: 'order_id required' }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const internalNotes = parseInternalNotes(body);
  if (internalNotes === undefined) {
    return NextResponse.json(
      { error: 'internal_notes must be a string or null' },
      { status: 400 }
    );
  }
  if (internalNotes && internalNotes.length > MAX_INTERNAL_NOTES_LENGTH) {
    return NextResponse.json(
      { error: `internal_notes must be ${MAX_INTERNAL_NOTES_LENGTH} characters or fewer` },
      { status: 400 }
    );
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
  }

  const { data: existing, error: fetchError } = await supabase
    .from('orders')
    .select('order_id, internal_notes')
    .eq('order_id', orderId)
    .single();

  if (fetchError || !existing) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  const { data: updated, error } = await supabase
    .from('orders')
    .update({
      internal_notes: internalNotes,
      updated_at: new Date().toISOString(),
    })
    .eq('order_id', orderId)
    .select('order_id, internal_notes')
    .single();

  if (error) {
    console.error('[admin] internal notes update error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logAudit(session.user.email ?? 'unknown', 'NOTE_UPDATE', orderId, {
    from: { internal_notes: existing.internal_notes ?? null },
    to: { internal_notes: internalNotes },
  });

  return NextResponse.json({ ok: true, order: updated });
}
