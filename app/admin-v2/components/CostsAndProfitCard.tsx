'use client';

import { useState, useEffect } from 'react';
import { computeProfit, formatThb } from '@/lib/costsUtils';
import type { SupabaseOrderRow } from '@/lib/supabase/adminQueries';

interface CostsAndProfitCardProps {
  order: SupabaseOrderRow;
  canEdit?: boolean;
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

export function CostsAndProfitCard({ order, canEdit = true }: CostsAndProfitCardProps) {
  const totalAmount = order.total_amount ?? order.grand_total ?? null;
  const [cogs, setCogs] = useState(toInputValue(order.cogs_amount));
  const [deliveryCost, setDeliveryCost] = useState(toInputValue(order.delivery_cost));
  const [paymentFee, setPaymentFee] = useState(toInputValue(order.payment_fee));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const initialCogs = toInputValue(order.cogs_amount);
  const initialDelivery = toInputValue(order.delivery_cost);
  const initialPayment = toInputValue(order.payment_fee);

  const hasChanges =
    cogs !== initialCogs || deliveryCost !== initialDelivery || paymentFee !== initialPayment;

  const cogsNum = parseInput(cogs);
  const deliveryNum = parseInput(deliveryCost);
  const paymentNum = parseInput(paymentFee);

  const profit = computeProfit(totalAmount, cogsNum, deliveryNum, paymentNum);
  const costsSet = order.cogs_amount != null || order.delivery_cost != null || order.payment_fee != null;

  const handleSave = async () => {
    if (!hasChanges || saving) return;
    setSaving(true);
    setMessage(null);
    try {
      const body: Record<string, number | null> = {};
      body.cogs_amount = cogsNum;
      body.delivery_cost = deliveryNum;
      body.payment_fee = paymentNum;

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
      window.location.reload();
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
    <section className="admin-v2-section admin-v2-costs-card">
      <h2 className="admin-v2-section-title">Costs & Profit</h2>

      {!costsSet && (
        <p className="admin-v2-costs-warning">Costs not set (profit is estimated)</p>
      )}

      <div className="admin-v2-costs-grid">
        {canEdit ? (
          <>
            <div className="admin-v2-costs-input-group">
              <label htmlFor="cogs">COGS (฿)</label>
              <input
                id="cogs"
                type="number"
                min={0}
                step={0.01}
                value={cogs}
                onChange={(e) => setCogs(e.target.value)}
                onBlur={(e) => handleBlur(e, setCogs)}
                placeholder="0"
                className="admin-v2-input"
              />
            </div>
            <div className="admin-v2-costs-input-group">
              <label htmlFor="delivery-cost">Delivery cost (฿)</label>
              <input
                id="delivery-cost"
                type="number"
                min={0}
                step={0.01}
                value={deliveryCost}
                onChange={(e) => setDeliveryCost(e.target.value)}
                onBlur={(e) => handleBlur(e, setDeliveryCost)}
                placeholder="0"
                className="admin-v2-input"
              />
            </div>
            <div className="admin-v2-costs-input-group">
              <label htmlFor="payment-fee">Payment fee (฿)</label>
              <input
                id="payment-fee"
                type="number"
                min={0}
                step={0.01}
                value={paymentFee}
                onChange={(e) => setPaymentFee(e.target.value)}
                onBlur={(e) => handleBlur(e, setPaymentFee)}
                placeholder="0"
                className="admin-v2-input"
              />
            </div>
          </>
        ) : (
          <>
            <div className="admin-v2-costs-input-group">
              <label>COGS (฿)</label>
              <p>{cogs || '—'}</p>
            </div>
            <div className="admin-v2-costs-input-group">
              <label>Delivery cost (฿)</label>
              <p>{deliveryCost || '—'}</p>
            </div>
            <div className="admin-v2-costs-input-group">
              <label>Payment fee (฿)</label>
              <p>{paymentFee || '—'}</p>
            </div>
          </>
        )}
      </div>

      <div className="admin-v2-costs-display">
        <div>
          <strong>Total</strong>
          <p>{totalAmount != null ? formatThb(totalAmount) : 'Total unknown'}</p>
        </div>
        <div>
          <strong>Profit</strong>
          <p className="admin-v2-profit">{profit != null ? formatThb(profit) : '—'}</p>
        </div>
      </div>

      {order.updated_at && (
        <p className="admin-v2-costs-updated">
          Costs last updated: {new Date(order.updated_at).toLocaleString()}
        </p>
      )}

      {canEdit && (
        <div className="admin-v2-costs-actions">
          <button
            type="button"
            onClick={handleSave}
            disabled={!hasChanges || saving}
            className="admin-v2-btn"
          >
            {saving ? 'Saving…' : 'Save costs'}
          </button>
          {message && (
            <span className={message.type === 'success' ? 'admin-v2-costs-success' : 'admin-v2-costs-error'}>
              {message.text}
            </span>
          )}
        </div>
      )}
    </section>
  );
}
