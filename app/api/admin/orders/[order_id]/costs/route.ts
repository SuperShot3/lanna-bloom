import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { requireRole } from '@/lib/adminRbac';
import { logAudit } from '@/lib/auditLog';

/** Returns { value, invalid }. invalid=true means reject the request. */
function parseCost(value: unknown): { value: number | null; invalid: boolean } {
  if (value == null) return { value: null, invalid: false };
  if (typeof value === 'number') {
    if (Number.isNaN(value) || value < 0) return { value: null, invalid: true };
    return { value: Math.round(value * 100) / 100, invalid: false };
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') return { value: null, invalid: false };
    const n = parseFloat(trimmed);
    if (Number.isNaN(n) || n < 0) return { value: null, invalid: true };
    return { value: Math.round(n * 100) / 100, invalid: false };
  }
  return { value: null, invalid: true };
}

function parseItemCosts(value: unknown): { items: Array<{ id: string; cost: number | null }> | null; invalid: boolean } {
  if (value == null) return { items: null, invalid: false };
  if (!Array.isArray(value)) return { items: null, invalid: true };
  const items: Array<{ id: string; cost: number | null }> = [];
  for (const it of value) {
    if (!it || typeof it !== 'object') return { items: null, invalid: true };
    const obj = it as Record<string, unknown>;
    const idRaw = obj.id;
    const id =
      typeof idRaw === 'string' ? idRaw.trim() :
      typeof idRaw === 'number' ? String(idRaw) :
      '';
    if (!id) return { items: null, invalid: true };
    const c = parseCost(obj.cost);
    if (c.invalid) return { items: null, invalid: true };
    items.push({ id, cost: c.value });
  }
  return { items, invalid: false };
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ order_id: string }> }
) {
  const authResult = await requireRole(['OWNER', 'MANAGER']);
  if (!authResult.ok) return authResult.response;
  const { session } = authResult;

  const { order_id } = await params;
  if (!order_id?.trim()) {
    return NextResponse.json({ error: 'order_id required' }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Body must be an object' }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const hasCogs = 'cogs_amount' in b;
  const hasDelivery = 'delivery_cost' in b;
  const hasPayment = 'payment_fee' in b;
  const hasItemCosts = 'item_costs' in b;

  if (!hasCogs && !hasDelivery && !hasPayment && !hasItemCosts) {
    return NextResponse.json(
      { error: 'At least one of cogs_amount, delivery_cost, payment_fee, item_costs must be provided' },
      { status: 400 }
    );
  }

  const cogsResult = hasCogs ? parseCost(b.cogs_amount) : null;
  const deliveryResult = hasDelivery ? parseCost(b.delivery_cost) : null;
  const paymentResult = hasPayment ? parseCost(b.payment_fee) : null;
  const itemCostsResult = hasItemCosts ? parseItemCosts(b.item_costs) : null;

  if (cogsResult?.invalid || deliveryResult?.invalid || paymentResult?.invalid || itemCostsResult?.invalid) {
    return NextResponse.json(
      { error: 'Invalid value: only numeric values >= 0 allowed (max 2 decimal places)' },
      { status: 400 }
    );
  }

  const cogs_amount = cogsResult?.value;
  const delivery_cost = deliveryResult?.value;
  const payment_fee = paymentResult?.value;

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json(
      { error: 'Supabase not configured' },
      { status: 503 }
    );
  }

  const updatePayload: Record<string, number | null> = {};
  if (hasCogs) updatePayload.cogs_amount = cogs_amount ?? null;
  if (hasDelivery) updatePayload.delivery_cost = delivery_cost ?? null;
  if (hasPayment) updatePayload.payment_fee = payment_fee ?? null;

  try {
    // Enforce required COGS (> 0). Allow omitting cogs_amount only if the order already has COGS set.
    const { data: existingOrder, error: existingErr } = await supabase
      .from('orders')
      .select('order_id, cogs_amount, paid_at, created_at')
      .eq('order_id', order_id.trim())
      .single();
    if (existingErr || !existingOrder) {
      return NextResponse.json({ error: existingErr?.message ?? 'Order not found' }, { status: 404 });
    }

    // If item_costs provided, update those rows and recompute total COGS from items.
    let nextCogs = hasCogs ? (cogs_amount ?? null) : (existingOrder.cogs_amount ?? null);
    if (hasItemCosts && itemCostsResult?.items && itemCostsResult.items.length > 0) {
      // Ensure item ids belong to this order, then update costs.
      const ids = itemCostsResult.items.map((x) => x.id);
      const { data: orderItems, error: itemsErr } = await supabase
        .from('order_items')
        .select('id')
        .eq('order_id', order_id.trim())
        .in('id', ids);
      if (itemsErr) {
        return NextResponse.json({ error: itemsErr.message }, { status: 500 });
      }
      const allowed = new Set((orderItems ?? []).map((x) => String((x as { id?: unknown }).id ?? '')));
      for (const it of itemCostsResult.items) {
        if (!allowed.has(it.id)) {
          return NextResponse.json({ error: 'Invalid item id for this order' }, { status: 400 });
        }
      }
      for (const it of itemCostsResult.items) {
        await supabase
          .from('order_items')
          .update({ cost: it.cost, })
          .eq('order_id', order_id.trim())
          .eq('id', it.id);
      }
      const { data: allItems, error: allItemsErr } = await supabase
        .from('order_items')
        .select('cost')
        .eq('order_id', order_id.trim());
      if (allItemsErr) {
        return NextResponse.json({ error: allItemsErr.message }, { status: 500 });
      }
      const sum = (allItems ?? []).reduce((s, r) => s + (parseFloat(String(r.cost)) || 0), 0);
      nextCogs = Math.round(sum * 100) / 100;
      updatePayload.cogs_amount = nextCogs;
    }

    if (nextCogs == null || Number(nextCogs) <= 0) {
      return NextResponse.json(
        { error: 'COGS is required and must be greater than 0' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('orders')
      .update({
        ...updatePayload,
        updated_at: new Date().toISOString(),
      })
      .eq('order_id', order_id.trim())
      .select()
      .single();

    if (error) {
      console.error('[admin] costs update error:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    // Upsert COGS as an expense so it flows into Accounting automatically.
    // We link by linked_order_id so we can update the same row when COGS changes.
    const expenseDateIso =
      (existingOrder.paid_at ? String(existingOrder.paid_at).slice(0, 10) : '') ||
      (existingOrder.created_at ? String(existingOrder.created_at).slice(0, 10) : '') ||
      new Date().toISOString().slice(0, 10);
    const cogsExpenseDesc = `COGS (flowers) — order ${order_id.trim()}`;
    const adminEmail = session.user.email ?? 'unknown';

    const { data: existingExpense, error: existingExpenseErr } = await supabase
      .from('expenses')
      .select('id, receipt_attached, receipt_file_path')
      .eq('linked_order_id', order_id.trim())
      .eq('category', 'flowers')
      .limit(1)
      .maybeSingle();
    if (existingExpenseErr) {
      return NextResponse.json({ error: existingExpenseErr.message }, { status: 500 });
    }

    let cogsExpense: { id: string; receipt_attached: boolean; receipt_file_path: string | null } | null = null;
    if (existingExpense?.id) {
      const { data: updatedExpense, error: updateExpenseErr } = await supabase
        .from('expenses')
        .update({
          amount: Number(nextCogs),
          currency: 'THB',
          date: expenseDateIso,
          description: cogsExpenseDesc,
          payment_method: 'bank_transfer',
          notes: 'Auto from order COGS',
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingExpense.id)
        .select('id, receipt_attached, receipt_file_path')
        .single();
      if (updateExpenseErr) {
        return NextResponse.json({ error: updateExpenseErr.message }, { status: 500 });
      }
      cogsExpense = {
        id: String(updatedExpense.id),
        receipt_attached: updatedExpense.receipt_attached === true,
        receipt_file_path: (updatedExpense.receipt_file_path as string | null) ?? null,
      };
    } else {
      const { data: insertedExpense, error: insertExpenseErr } = await supabase
        .from('expenses')
        .insert({
          amount: Number(nextCogs),
          currency: 'THB',
          date: expenseDateIso,
          category: 'flowers',
          description: cogsExpenseDesc,
          payment_method: 'bank_transfer',
          receipt_file_path: null,
          receipt_attached: false,
          created_by: adminEmail,
          notes: 'Auto from order COGS',
          linked_order_id: order_id.trim(),
        })
        .select('id, receipt_attached, receipt_file_path')
        .single();
      if (insertExpenseErr) {
        return NextResponse.json({ error: insertExpenseErr.message }, { status: 500 });
      }
      cogsExpense = {
        id: String(insertedExpense.id),
        receipt_attached: insertedExpense.receipt_attached === true,
        receipt_file_path: (insertedExpense.receipt_file_path as string | null) ?? null,
      };
    }

    await logAudit(adminEmail, 'COSTS_UPDATE', order_id.trim(), {
      before: {},
      after: updatePayload,
    });

    return NextResponse.json({ ok: true, order: data, cogsExpense });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[admin] costs update exception:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
