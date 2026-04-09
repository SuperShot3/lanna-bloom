'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { computeProfit, formatThb } from '@/lib/costsUtils';
import type { SupabaseOrderRow, SupabaseOrderItemRow } from '@/lib/supabase/adminQueries';

interface CostsAndProfitCardProps {
  order: SupabaseOrderRow;
  items?: SupabaseOrderItemRow[];
  canEdit?: boolean;
}

function sumPartnerItemsCost(items: SupabaseOrderItemRow[]): number {
  return items
    .filter((i) => i.item_type === 'product')
    .reduce((s, i) => s + (i.cost ?? 0), 0);
}

function toInputValue(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return '';
  return String(n);
}

function parseInput(s: string): number | null {
  const t = s.trim();
  if (t === '') return null;
  const n = parseFloat(t);
  if (Number.isNaN(n) || n < 0) return null;
  return Math.round(n * 100) / 100;
}

export function CostsAndProfitCard({ order, items = [], canEdit = true }: CostsAndProfitCardProps) {
  const router = useRouter();
  const totalAmount = order.total_amount ?? order.grand_total ?? null;
  const partnerItemsCogs = sumPartnerItemsCost(items);
  const effectiveInitialCogs =
    order.cogs_amount ?? (partnerItemsCogs > 0 ? partnerItemsCogs : null);
  const [cogs, setCogs] = useState(toInputValue(effectiveInitialCogs));
  const [deliveryCost, setDeliveryCost] = useState(toInputValue(order.delivery_cost));
  const [paymentFee, setPaymentFee] = useState(toInputValue(order.payment_fee));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const itemCostStateInit = useMemo(() => {
    const map: Record<string, string> = {};
    for (const it of items) {
      const id = it.id;
      if (id == null) continue;
      map[String(id)] = toInputValue(it.cost ?? null);
    }
    return map;
  }, [items]);
  const [itemCosts, setItemCosts] = useState<Record<string, string>>(itemCostStateInit);

  const computedCogsFromItems = useMemo(() => {
    const withIds = items.filter((it) => it.id != null);
    if (withIds.length === 0) return null;
    let sum = 0;
    for (const it of withIds) {
      const v = itemCosts[String(it.id)];
      const n = v == null ? null : parseInput(String(v));
      sum += n ?? 0;
    }
    return Math.round(sum * 100) / 100;
  }, [items, itemCosts]);

  const usingPerItem = items.some((it) => it.id != null);
  const effectiveCogsNum = usingPerItem ? computedCogsFromItems : parseInput(cogs);

  const displayCogs = effectiveCogsNum ?? 0;

  const initialCogs = toInputValue(effectiveInitialCogs);
  const initialDelivery = toInputValue(order.delivery_cost);
  const initialPayment = toInputValue(order.payment_fee);

  const hasChanges =
    cogs !== initialCogs ||
    deliveryCost !== initialDelivery ||
    paymentFee !== initialPayment ||
    (usingPerItem && JSON.stringify(itemCosts) !== JSON.stringify(itemCostStateInit));

  const cogsNum = effectiveCogsNum;
  const deliveryNum = parseInput(deliveryCost);
  const paymentNum = parseInput(paymentFee);

  const profit = computeProfit(totalAmount, cogsNum, deliveryNum, paymentNum);
  const costsSet = order.cogs_amount != null || order.delivery_cost != null || order.payment_fee != null;

  const handleSave = async () => {
    if (!hasChanges || saving) return;
    setSaving(true);
    setMessage(null);
    try {
      // COGS is required (must be > 0) for proper accounting.
      if (cogsNum == null || cogsNum <= 0) {
        setMessage({ type: 'error', text: 'COGS is required and must be greater than 0' });
        return;
      }
      const body: Record<string, unknown> = {};
      body.cogs_amount = cogsNum;
      body.delivery_cost = deliveryNum;
      body.payment_fee = paymentNum;
      if (usingPerItem) {
        const payload = items
          .filter((it) => it.id != null)
          .map((it) => ({
            id: it.id,
            cost: parseInput(itemCosts[String(it.id)] ?? ''),
          }));
        body.item_costs = payload;
      }

      const res = await fetch(`/api/admin/orders/${encodeURIComponent(order.order_id)}/costs`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setMessage({ type: 'error', text: data.error ?? 'Failed to save costs' });
        return;
      }

      setMessage({ type: 'success', text: 'Costs saved' });
      setTimeout(() => setMessage(null), 3000);
      router.refresh();
    } catch (e) {
      setMessage({
        type: 'error',
        text: e instanceof Error ? e.message : 'Network error',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>, setter: (v: string) => void) => {
    const v = e.target.value.trim();
    if (v === '') {
      setter('');
      return;
    }
    const n = parseFloat(v);
    if (!Number.isNaN(n) && n >= 0) {
      setter(String(Math.round(n * 100) / 100));
    }
  };

  return (
    <section className="admin-section admin-costs-card">
      <h2 className="admin-section-title">Costs & Profit</h2>

      {!costsSet && (
        <p className="admin-costs-warning">Costs not set (profit is estimated)</p>
      )}

      {/* Items: one cost field per item */}
      {items.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <h3 className="admin-section-title" style={{ fontSize: 16, marginBottom: 8 }}>
            Items
          </h3>
          <div
            className="admin-expenses-table-wrap"
            style={{ display: 'inline-block', maxWidth: '100%', overflowX: 'auto' }}
          >
            <table
              className="admin-expenses-table"
              style={{ width: 'fit-content', display: 'inline-table' }}
            >
              <thead>
                <tr>
                  <th>Item</th>
                  <th className="admin-expenses-col-amount">Sell price</th>
                  <th className="admin-expenses-col-amount">Cost</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => {
                  const title = it.bouquet_title ?? it.bouquet_id ?? `Item ${idx + 1}`;
                  const size = it.size ? ` · ${it.size}` : '';
                  const sell = it.price ?? null;
                  const rowKey = it.id != null ? String(it.id) : `${it.bouquet_id ?? 'x'}-${idx}`;
                  const canEditItem = canEdit && it.id != null;
                  const value = it.id != null ? (itemCosts[String(it.id)] ?? '') : '';
                  return (
                    <tr key={rowKey}>
                      <td>{title}{size}</td>
                      <td className="admin-expenses-amount">{sell != null ? formatThb(sell) : '—'}</td>
                      <td className="admin-expenses-amount">
                        {canEditItem ? (
                          <input
                            type="number"
                            min={0}
                            step={0.01}
                            className="admin-input"
                            style={{ maxWidth: 140 }}
                            value={value}
                            onChange={(e) => setItemCosts((prev) => ({ ...prev, [String(it.id)]: e.target.value }))}
                            onBlur={(e) => {
                              const v = e.target.value.trim();
                              if (v === '') return;
                              const n = parseFloat(v);
                              if (!Number.isNaN(n) && n >= 0) {
                                setItemCosts((prev) => ({ ...prev, [String(it.id)]: String(Math.round(n * 100) / 100) }));
                              }
                            }}
                            placeholder="0"
                            aria-label={`Cost for ${title}${size}`}
                          />
                        ) : (
                          formatThb(it.cost ?? null)
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {usingPerItem && (
            <p className="admin-hint" style={{ marginTop: 8 }}>
              Total COGS is calculated automatically from item costs.
            </p>
          )}
        </div>
      )}

      {/* Extra costs */}
      <div style={{ marginTop: 14 }}>
        <h3 className="admin-section-title" style={{ fontSize: 16, marginBottom: 8 }}>
          Extra costs
        </h3>
        <div className="admin-costs-grid">
          <div className="admin-costs-input-group">
            <label htmlFor="delivery-cost">Delivery (฿)</label>
            {canEdit ? (
              <input
                id="delivery-cost"
                type="number"
                min={0}
                step={0.01}
                value={deliveryCost}
                onChange={(e) => setDeliveryCost(e.target.value)}
                onBlur={(e) => handleBlur(e, setDeliveryCost)}
                placeholder="0"
                className="admin-input"
              />
            ) : (
              <p>{deliveryCost || '—'}</p>
            )}
          </div>
          <div className="admin-costs-input-group">
            <label htmlFor="payment-fee">Other fee (฿)</label>
            {canEdit ? (
              <input
                id="payment-fee"
                type="number"
                min={0}
                step={0.01}
                value={paymentFee}
                onChange={(e) => setPaymentFee(e.target.value)}
                onBlur={(e) => handleBlur(e, setPaymentFee)}
                placeholder="0"
                className="admin-input"
              />
            ) : (
              <p>{paymentFee || '—'}</p>
            )}
          </div>
        </div>
      </div>

      <div className="admin-costs-display">
        <div>
          <strong>Total</strong>
          <p>{totalAmount != null ? formatThb(totalAmount) : 'Total unknown'}</p>
        </div>
        <div>
          <strong>Total COGS</strong>
          <p>{formatThb(displayCogs)}</p>
        </div>
        <div>
          <strong>Profit</strong>
          <p className="admin-profit">{profit != null ? formatThb(profit) : '—'}</p>
        </div>
      </div>

      {order.updated_at && (
        <p className="admin-costs-updated">
          Costs last updated: {new Date(order.updated_at).toLocaleString()}
        </p>
      )}

      {canEdit && (
        <div className="admin-costs-actions">
          <button
            type="button"
            onClick={handleSave}
            disabled={!hasChanges || saving}
            className="admin-btn"
          >
            {saving ? 'Saving…' : 'Save costs'}
          </button>
          {message && (
            <span className={message.type === 'success' ? 'admin-costs-success' : 'admin-costs-error'}>
              {message.text}
            </span>
          )}
        </div>
      )}
    </section>
  );
}
