import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { requireRole } from '@/lib/adminRbac';
import { logAudit } from '@/lib/auditLog';
import { deleteExpenseByIdCascade } from '@/lib/expenses/deleteExpenseByIdCascade';
import {
  ORDER_COSTS_DELIVERY_SYNC_NOTE,
  ORDER_COSTS_FLOWERS_SYNC_NOTE,
} from '@/lib/expenses/expenseQueries';
import { mergeBillTracking, resolveBillLinesTarget } from '@/lib/expenses/billTracking';
import { parseExpenseBillTrackingJson } from '@/types/expenses';

function trimExpenseNotes(n: unknown): string {
  return typeof n === 'string' ? n.trim() : '';
}

/**
 * Pick which linked expense row PATCH /costs should update.
 * Prefer an existing receipt so proof is not orphaned when removing duplicate rows.
 */
function pickCanonicalAmongMergeable(
  mergeable: { id: unknown; notes?: unknown; receipt_attached?: unknown }[],
  syncNote: string
): string | null {
  if (!mergeable.length) return null;
  const withReceipt = mergeable.filter((r) => r.receipt_attached === true);
  const pool = withReceipt.length > 0 ? withReceipt : mergeable;
  const synced = pool.find((r) => trimExpenseNotes(r.notes) === syncNote);
  if (synced?.id != null && synced.id !== '') return String(synced.id);
  const first = pool[0];
  return first?.id != null && first.id !== '' ? String(first.id) : null;
}

/** Safe to merge/delete: legacy empty notes or duplicate auto-sync rows — not third-party manual notes. */
function isAutoMergeExpenseNotes(notes: unknown, syncNote: string): boolean {
  const t = trimExpenseNotes(notes);
  return t === '' || t === syncNote;
}

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
      .select('order_id, cogs_amount, delivery_cost, paid_at, created_at')
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
    const nextDelivery = hasDelivery ? (delivery_cost ?? null) : (existingOrder.delivery_cost ?? null);
    const roundedCogs = Math.round((Number(nextCogs) || 0) * 100) / 100;
    const rawDelNum = Number(nextDelivery);
    const roundedDelivery =
      nextDelivery != null && !Number.isNaN(rawDelNum) && rawDelNum > 0
        ? Math.round(rawDelNum * 100) / 100
        : 0;

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

    // Upsert **flowers COGS** and **delivery (driver)** as separate expenses linked to this order.
    const expenseDateIso =
      (existingOrder.paid_at ? String(existingOrder.paid_at).slice(0, 10) : '') ||
      (existingOrder.created_at ? String(existingOrder.created_at).slice(0, 10) : '') ||
      new Date().toISOString().slice(0, 10);
    const cogsExpenseDesc = `COGS (flowers) — order ${order_id.trim()}`;
    const adminEmail = session.user.email ?? 'unknown';

    const { data: flowerRows, error: flowerRowsErr } = await supabase
      .from('expenses')
      .select('id, receipt_attached, receipt_file_path, bill_tracking, notes')
      .eq('linked_order_id', order_id.trim())
      .eq('category', 'flowers')
      .order('created_at', { ascending: true });

    if (flowerRowsErr) {
      return NextResponse.json({ error: flowerRowsErr.message }, { status: 500 });
    }

    const mergeableFlowers = (flowerRows ?? []).filter((r) =>
      isAutoMergeExpenseNotes((r as { notes?: unknown }).notes, ORDER_COSTS_FLOWERS_SYNC_NOTE)
    );
    let canonicalFlowerId = pickCanonicalAmongMergeable(
      mergeableFlowers as { id: unknown; notes?: unknown; receipt_attached?: unknown }[],
      ORDER_COSTS_FLOWERS_SYNC_NOTE
    );
    if (canonicalFlowerId == null && flowerRows?.length) {
      canonicalFlowerId = String((flowerRows[0] as { id: unknown }).id);
    }

    let existingExpense =
      canonicalFlowerId != null
        ? flowerRows?.find((r) => String(r.id) === canonicalFlowerId)
        : undefined;

    let cogsExpense: { id: string; receipt_attached: boolean; receipt_file_path: string | null } | null = null;
    const checklistTemplates = await resolveBillLinesTarget(order_id.trim(), 'flowers');
    const mergedBillTracking = mergeBillTracking(
      parseExpenseBillTrackingJson(existingExpense?.bill_tracking),
      checklistTemplates
    );
    if (existingExpense?.id) {
      const { data: updatedExpense, error: updateExpenseErr } = await supabase
        .from('expenses')
        .update({
          amount: roundedCogs,
          currency: 'THB',
          date: expenseDateIso,
          description: cogsExpenseDesc,
          payment_method: 'bank_transfer',
          notes: ORDER_COSTS_FLOWERS_SYNC_NOTE,
          bill_tracking: mergedBillTracking,
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
          amount: roundedCogs,
          currency: 'THB',
          date: expenseDateIso,
          category: 'flowers',
          description: cogsExpenseDesc,
          payment_method: 'bank_transfer',
          receipt_file_path: null,
          receipt_attached: false,
          created_by: adminEmail,
          notes: ORDER_COSTS_FLOWERS_SYNC_NOTE,
          linked_order_id: order_id.trim(),
          bill_tracking: mergedBillTracking,
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

    if (cogsExpense?.id) {
      for (const r of flowerRows ?? []) {
        const rid = String((r as { id?: unknown }).id ?? '');
        if (!rid || rid === cogsExpense.id) continue;
        if (
          !isAutoMergeExpenseNotes((r as { notes?: unknown }).notes, ORDER_COSTS_FLOWERS_SYNC_NOTE)
        ) {
          continue;
        }
        const casc = await deleteExpenseByIdCascade(supabase, rid);
        if (casc.error) {
          return NextResponse.json({ error: casc.error }, { status: 500 });
        }
      }
    }

    let deliveryExpense: {
      id: string;
      receipt_attached: boolean;
      receipt_file_path: string | null;
    } | null = null;

    if (roundedDelivery <= 0) {
      const { data: toDelete, error: listDelErr } = await supabase
        .from('expenses')
        .select('id')
        .eq('linked_order_id', order_id.trim())
        .eq('category', 'delivery')
        .eq('notes', ORDER_COSTS_DELIVERY_SYNC_NOTE);
      if (listDelErr) {
        return NextResponse.json({ error: listDelErr.message }, { status: 500 });
      }
      for (const row of toDelete ?? []) {
        const rid = String((row as { id?: unknown }).id ?? '');
        if (!rid) continue;
        const casc = await deleteExpenseByIdCascade(supabase, rid);
        if (casc.error) {
          return NextResponse.json({ error: casc.error }, { status: 500 });
        }
      }
      deliveryExpense = null;
    } else {
      const deliveryExpenseDesc = `Delivery (driver) — order ${order_id.trim()}`;
      const { data: deliveryRows, error: deliveryRowsErr } = await supabase
        .from('expenses')
        .select('id, receipt_attached, receipt_file_path, bill_tracking, notes')
        .eq('linked_order_id', order_id.trim())
        .eq('category', 'delivery')
        .order('created_at', { ascending: true });
      if (deliveryRowsErr) {
        return NextResponse.json({ error: deliveryRowsErr.message }, { status: 500 });
      }
      const canonicalDeliveryId =
        pickCanonicalAmongMergeable(
          deliveryRows.filter((r) =>
            isAutoMergeExpenseNotes((r as { notes?: unknown }).notes, ORDER_COSTS_DELIVERY_SYNC_NOTE)
          ) as { id: unknown; notes?: unknown; receipt_attached?: unknown }[],
          ORDER_COSTS_DELIVERY_SYNC_NOTE
        ) ??
        (deliveryRows?.length ? String((deliveryRows[0] as { id: unknown }).id) : null);
      const existingDeliveryExpense =
        canonicalDeliveryId != null
          ? deliveryRows?.find((r) => String(r.id) === canonicalDeliveryId)
          : undefined;
      const deliveryTemplates = await resolveBillLinesTarget(order_id.trim(), 'delivery');
      const mergedDeliveryBill = mergeBillTracking(
        parseExpenseBillTrackingJson(existingDeliveryExpense?.bill_tracking),
        deliveryTemplates
      );
      if (existingDeliveryExpense?.id) {
        const { data: updatedDel, error: updateDelErr } = await supabase
          .from('expenses')
          .update({
            amount: roundedDelivery,
            currency: 'THB',
            date: expenseDateIso,
            description: deliveryExpenseDesc,
            payment_method: 'cash',
            notes: ORDER_COSTS_DELIVERY_SYNC_NOTE,
            bill_tracking: mergedDeliveryBill,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingDeliveryExpense.id)
          .select('id, receipt_attached, receipt_file_path')
          .single();
        if (updateDelErr) {
          return NextResponse.json({ error: updateDelErr.message }, { status: 500 });
        }
        deliveryExpense = {
          id: String(updatedDel.id),
          receipt_attached: updatedDel.receipt_attached === true,
          receipt_file_path: (updatedDel.receipt_file_path as string | null) ?? null,
        };
      } else {
        const { data: insertedDel, error: insertDelErr } = await supabase
          .from('expenses')
          .insert({
            amount: roundedDelivery,
            currency: 'THB',
            date: expenseDateIso,
            category: 'delivery',
            description: deliveryExpenseDesc,
            payment_method: 'cash',
            receipt_file_path: null,
            receipt_attached: false,
            created_by: adminEmail,
            notes: ORDER_COSTS_DELIVERY_SYNC_NOTE,
            linked_order_id: order_id.trim(),
            bill_tracking: mergedDeliveryBill,
          })
          .select('id, receipt_attached, receipt_file_path')
          .single();
        if (insertDelErr) {
          return NextResponse.json({ error: insertDelErr.message }, { status: 500 });
        }
        deliveryExpense = {
          id: String(insertedDel.id),
          receipt_attached: insertedDel.receipt_attached === true,
          receipt_file_path: (insertedDel.receipt_file_path as string | null) ?? null,
        };
      }

      if (deliveryExpense?.id) {
        for (const r of deliveryRows ?? []) {
          const rid = String((r as { id?: unknown }).id ?? '');
          if (!rid || rid === deliveryExpense.id) continue;
          if (
            !isAutoMergeExpenseNotes((r as { notes?: unknown }).notes, ORDER_COSTS_DELIVERY_SYNC_NOTE)
          ) {
            continue;
          }
          const casc = await deleteExpenseByIdCascade(supabase, rid);
          if (casc.error) {
            return NextResponse.json({ error: casc.error }, { status: 500 });
          }
        }
      }
    }

    await logAudit(adminEmail, 'COSTS_UPDATE', order_id.trim(), {
      before: {},
      after: updatePayload,
    });

    return NextResponse.json({ ok: true, order: data, cogsExpense, deliveryExpense });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[admin] costs update exception:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
