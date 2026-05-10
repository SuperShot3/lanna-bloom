'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { computeProfit, formatThb } from '@/lib/costsUtils';
import type { SupabaseOrderRow, SupabaseOrderItemRow } from '@/lib/supabase/adminQueries';
import type { Expense, ExpenseReceiptImage } from '@/types/expenses';
import { confirmDeleteAction } from '@/app/admin/components/confirmDelete';
import { compressReceiptImageForUpload } from '@/lib/receiptImageCompress';
import { isReceiptImageFile } from '@/lib/isReceiptImageFile';
import { MAX_RECEIPT_UPLOAD_BYTES, MAX_RECEIPT_UPLOAD_LABEL } from '@/lib/receiptUploadLimits';
const DELETE_RECEIPT_CONFIRM =
  'Are you sure you want to delete this receipt? This cannot be undone.';

type LinkedExpenseRef = Pick<Expense, 'id' | 'receipt_attached' | 'receipt_file_path'> | null;

interface CostsAndProfitCardProps {
  order: SupabaseOrderRow;
  items?: SupabaseOrderItemRow[];
  canEdit?: boolean;
  initialCogsExpense?: LinkedExpenseRef;
  initialDeliveryExpense?: LinkedExpenseRef;
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

function receiptFileName(path: string | null): string | null {
  if (!path) return null;
  const raw = path.split('/').pop() ?? path;
  return decodeURIComponent(raw);
}

export function CostsAndProfitCard({
  order,
  items = [],
  canEdit = true,
  initialCogsExpense = null,
  initialDeliveryExpense = null,
}: CostsAndProfitCardProps) {
  const router = useRouter();
  const receiptFlowerInputRef = useRef<HTMLInputElement>(null);
  const receiptDeliveryInputRef = useRef<HTMLInputElement>(null);
  const totalAmount = order.total_amount ?? order.grand_total ?? null;
  const partnerItemsCogs = sumPartnerItemsCost(items);
  const effectiveInitialCogs =
    order.cogs_amount ?? (partnerItemsCogs > 0 ? partnerItemsCogs : null);
  const [cogs, setCogs] = useState(toInputValue(effectiveInitialCogs));
  const [deliveryCost, setDeliveryCost] = useState(toInputValue(order.delivery_cost));
  const [paymentFee, setPaymentFee] = useState(toInputValue(order.payment_fee));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [cogsExpense, setCogsExpense] = useState<LinkedExpenseRef>(initialCogsExpense);
  const [deliveryExpense, setDeliveryExpense] = useState<LinkedExpenseRef>(initialDeliveryExpense);
  const [flowerReceiptBusy, setFlowerReceiptBusy] = useState(false);
  const [loadingFlowerReceipt, setLoadingFlowerReceipt] = useState(false);
  const [downloadingFlowerReceipt, setDownloadingFlowerReceipt] = useState(false);
  const [flowerReceiptMessage, setFlowerReceiptMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );
  const [flowerReceipts, setFlowerReceipts] = useState<ExpenseReceiptImage[]>([]);
  const [loadingFlowerReceipts, setLoadingFlowerReceipts] = useState(false);
  const [flowerReceiptDeletingId, setFlowerReceiptDeletingId] = useState<string | null>(null);
  const flowerReceiptCount = flowerReceipts.length;
  const currentFlowerReceiptName =
    flowerReceiptCount > 0 ? flowerReceipts[0].file_name : receiptFileName(cogsExpense?.receipt_file_path ?? null);

  const [deliveryReceiptBusy, setDeliveryReceiptBusy] = useState(false);
  const [loadingDeliveryReceipt, setLoadingDeliveryReceipt] = useState(false);
  const [downloadingDeliveryReceipt, setDownloadingDeliveryReceipt] = useState(false);
  const [deliveryReceiptMessage, setDeliveryReceiptMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );
  const [deliveryReceipts, setDeliveryReceipts] = useState<ExpenseReceiptImage[]>([]);
  const [loadingDeliveryReceipts, setLoadingDeliveryReceipts] = useState(false);
  const [deliveryReceiptDeletingId, setDeliveryReceiptDeletingId] = useState<string | null>(null);
  const deliveryReceiptCount = deliveryReceipts.length;
  const currentDeliveryReceiptName =
    deliveryReceiptCount > 0
      ? deliveryReceipts[0].file_name
      : receiptFileName(deliveryExpense?.receipt_file_path ?? null);

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
  const showDeliveryExpenseBlock = deliveryNum != null && deliveryNum > 0;

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
      if (data.cogsExpense && typeof data.cogsExpense.id === 'string') {
        setCogsExpense({
          id: data.cogsExpense.id,
          receipt_attached: data.cogsExpense.receipt_attached === true,
          receipt_file_path:
            typeof data.cogsExpense.receipt_file_path === 'string'
              ? data.cogsExpense.receipt_file_path
              : null,
        });
      }
      if (data.deliveryExpense && typeof data.deliveryExpense.id === 'string') {
        setDeliveryExpense({
          id: data.deliveryExpense.id,
          receipt_attached: data.deliveryExpense.receipt_attached === true,
          receipt_file_path:
            typeof data.deliveryExpense.receipt_file_path === 'string'
              ? data.deliveryExpense.receipt_file_path
              : null,
        });
      } else {
        setDeliveryExpense(null);
        setDeliveryReceipts([]);
      }
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

  useEffect(() => {
    setCogsExpense(initialCogsExpense ?? null);
  }, [initialCogsExpense]);

  useEffect(() => {
    setDeliveryExpense(initialDeliveryExpense ?? null);
  }, [initialDeliveryExpense]);

  const loadFlowerReceipts = async (expenseId: string) => {
    setLoadingFlowerReceipts(true);
    try {
      const res = await fetch(`/api/admin/expenses/${encodeURIComponent(expenseId)}/receipts`, { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFlowerReceiptMessage({ type: 'error', text: data.error ?? 'Failed to load receipt images' });
        return;
      }
      setFlowerReceipts(Array.isArray(data.receipts) ? (data.receipts as ExpenseReceiptImage[]) : []);
    } catch {
      setFlowerReceiptMessage({ type: 'error', text: 'Unexpected error loading receipt images' });
    } finally {
      setLoadingFlowerReceipts(false);
    }
  };

  const loadDeliveryReceipts = async (expenseId: string) => {
    setLoadingDeliveryReceipts(true);
    try {
      const res = await fetch(`/api/admin/expenses/${encodeURIComponent(expenseId)}/receipts`, { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setDeliveryReceiptMessage({ type: 'error', text: data.error ?? 'Failed to load receipt images' });
        return;
      }
      setDeliveryReceipts(Array.isArray(data.receipts) ? (data.receipts as ExpenseReceiptImage[]) : []);
    } catch {
      setDeliveryReceiptMessage({ type: 'error', text: 'Unexpected error loading receipt images' });
    } finally {
      setLoadingDeliveryReceipts(false);
    }
  };

  useEffect(() => {
    if (!cogsExpense?.id) {
      setFlowerReceipts([]);
      return;
    }
    void loadFlowerReceipts(cogsExpense.id);
  }, [cogsExpense?.id]);

  useEffect(() => {
    if (!deliveryExpense?.id) {
      setDeliveryReceipts([]);
      return;
    }
    void loadDeliveryReceipts(deliveryExpense.id);
  }, [deliveryExpense?.id]);

  const openReceipt = async (expenseId: string, filePath: string, download = false) => {
    const q = new URLSearchParams({ path: filePath });
    if (download) q.set('download', '1');
    const res = await fetch(`/api/admin/expenses/${encodeURIComponent(expenseId)}/receipt-url?${q.toString()}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error ?? 'Failed to open receipt image');
    }
    if (download) {
      window.location.assign(data.signedUrl);
    } else {
      window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleViewFlowerReceipt = async () => {
    if (!cogsExpense?.id || !flowerReceipts[0]?.file_path) return;
    setLoadingFlowerReceipt(true);
    setFlowerReceiptMessage(null);
    try {
      await openReceipt(cogsExpense.id, flowerReceipts[0].file_path, false);
    } catch {
      setFlowerReceiptMessage({ type: 'error', text: 'Unexpected error loading receipt image' });
    } finally {
      setLoadingFlowerReceipt(false);
    }
  };

  const handleFlowerReceiptFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (!file) return;
    if (receiptFlowerInputRef.current) receiptFlowerInputRef.current.value = '';

    setFlowerReceiptMessage(null);
    if (!cogsExpense?.id) {
      setFlowerReceiptMessage({
        type: 'error',
        text: 'Save costs first so the Flowers COGS expense exists before attaching a receipt.',
      });
      return;
    }
    if (!isReceiptImageFile(file)) {
      setFlowerReceiptMessage({ type: 'error', text: 'Only image files are allowed.' });
      return;
    }

    setFlowerReceiptBusy(true);
    try {
      const fileToUpload = await compressReceiptImageForUpload(file, MAX_RECEIPT_UPLOAD_BYTES);
      const formData = new FormData();
      formData.append('file', fileToUpload);
      const uploadRes = await fetch(`/api/admin/expenses/${encodeURIComponent(cogsExpense.id)}/receipts`, {
        method: 'POST',
        body: formData,
      });
      const uploadData = await uploadRes.json().catch(() => ({}));
      if (!uploadRes.ok) {
        setFlowerReceiptMessage({ type: 'error', text: uploadData.error ?? 'Receipt upload failed' });
        return;
      }
      setCogsExpense((prev) => (prev ? { ...prev, receipt_attached: true } : prev));
      await loadFlowerReceipts(cogsExpense.id);
      setFlowerReceiptMessage({ type: 'success', text: 'Receipt attached (flowers / shop)' });
      router.refresh();
    } catch (err) {
      setFlowerReceiptMessage({
        type: 'error',
        text:
          err instanceof Error ? err.message : 'Network error while uploading receipt image',
      });
    } finally {
      setFlowerReceiptBusy(false);
    }
  };

  const handleDownloadFlowerReceipt = async () => {
    if (!cogsExpense?.id || !flowerReceipts[0]?.file_path) return;
    setDownloadingFlowerReceipt(true);
    setFlowerReceiptMessage(null);
    try {
      await openReceipt(cogsExpense.id, flowerReceipts[0].file_path, true);
    } catch {
      setFlowerReceiptMessage({ type: 'error', text: 'Unexpected error preparing download' });
    } finally {
      setDownloadingFlowerReceipt(false);
    }
  };

  const handleDeleteFlowerReceipt = async (receiptId: string) => {
    if (!cogsExpense?.id) return;
    if (!confirmDeleteAction(DELETE_RECEIPT_CONFIRM)) return;
    setFlowerReceiptDeletingId(receiptId);
    setFlowerReceiptMessage(null);
    try {
      const res = await fetch(
        `/api/admin/expenses/${encodeURIComponent(cogsExpense.id)}/receipts/${encodeURIComponent(receiptId)}`,
        { method: 'DELETE' }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFlowerReceiptMessage({ type: 'error', text: data.error ?? 'Delete failed' });
        return;
      }
      setCogsExpense((prev) =>
        prev
          ? {
              ...prev,
              receipt_attached: data.receipt_attached === true,
              receipt_file_path:
                typeof data.receipt_file_path === 'string' ? data.receipt_file_path : null,
            }
          : prev
      );
      await loadFlowerReceipts(cogsExpense.id);
      setFlowerReceiptMessage({ type: 'success', text: 'Receipt removed' });
      router.refresh();
    } catch {
      setFlowerReceiptMessage({ type: 'error', text: 'Network error while deleting receipt' });
    } finally {
      setFlowerReceiptDeletingId(null);
    }
  };

  const handleViewDeliveryReceipt = async () => {
    if (!deliveryExpense?.id || !deliveryReceipts[0]?.file_path) return;
    setLoadingDeliveryReceipt(true);
    setDeliveryReceiptMessage(null);
    try {
      await openReceipt(deliveryExpense.id, deliveryReceipts[0].file_path, false);
    } catch {
      setDeliveryReceiptMessage({ type: 'error', text: 'Unexpected error loading receipt image' });
    } finally {
      setLoadingDeliveryReceipt(false);
    }
  };

  const handleDeliveryReceiptFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (!file) return;
    if (receiptDeliveryInputRef.current) receiptDeliveryInputRef.current.value = '';

    setDeliveryReceiptMessage(null);
    if (!deliveryExpense?.id) {
      setDeliveryReceiptMessage({
        type: 'error',
        text: showDeliveryExpenseBlock
          ? 'Save costs first so the delivery expense exists before attaching proof to the driver.'
          : 'Delivery cost is zero — there is no driver expense row for receipts.',
      });
      return;
    }
    if (!isReceiptImageFile(file)) {
      setDeliveryReceiptMessage({ type: 'error', text: 'Only image files are allowed.' });
      return;
    }

    setDeliveryReceiptBusy(true);
    try {
      const fileToUpload = await compressReceiptImageForUpload(file, MAX_RECEIPT_UPLOAD_BYTES);
      const formData = new FormData();
      formData.append('file', fileToUpload);
      const uploadRes = await fetch(`/api/admin/expenses/${encodeURIComponent(deliveryExpense.id)}/receipts`, {
        method: 'POST',
        body: formData,
      });
      const uploadData = await uploadRes.json().catch(() => ({}));
      if (!uploadRes.ok) {
        setDeliveryReceiptMessage({ type: 'error', text: uploadData.error ?? 'Receipt upload failed' });
        return;
      }
      setDeliveryExpense((prev) => (prev ? { ...prev, receipt_attached: true } : prev));
      await loadDeliveryReceipts(deliveryExpense.id);
      setDeliveryReceiptMessage({ type: 'success', text: 'Receipt attached (driver)' });
      router.refresh();
    } catch (err) {
      setDeliveryReceiptMessage({
        type: 'error',
        text:
          err instanceof Error ? err.message : 'Network error while uploading receipt image',
      });
    } finally {
      setDeliveryReceiptBusy(false);
    }
  };

  const handleDownloadDeliveryReceipt = async () => {
    if (!deliveryExpense?.id || !deliveryReceipts[0]?.file_path) return;
    setDownloadingDeliveryReceipt(true);
    setDeliveryReceiptMessage(null);
    try {
      await openReceipt(deliveryExpense.id, deliveryReceipts[0].file_path, true);
    } catch {
      setDeliveryReceiptMessage({ type: 'error', text: 'Unexpected error preparing download' });
    } finally {
      setDownloadingDeliveryReceipt(false);
    }
  };

  const handleDeleteDeliveryReceipt = async (receiptId: string) => {
    if (!deliveryExpense?.id) return;
    if (!confirmDeleteAction(DELETE_RECEIPT_CONFIRM)) return;
    setDeliveryReceiptDeletingId(receiptId);
    setDeliveryReceiptMessage(null);
    try {
      const res = await fetch(
        `/api/admin/expenses/${encodeURIComponent(deliveryExpense.id)}/receipts/${encodeURIComponent(receiptId)}`,
        { method: 'DELETE' }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setDeliveryReceiptMessage({ type: 'error', text: data.error ?? 'Delete failed' });
        return;
      }
      setDeliveryExpense((prev) =>
        prev
          ? {
              ...prev,
              receipt_attached: data.receipt_attached === true,
              receipt_file_path:
                typeof data.receipt_file_path === 'string' ? data.receipt_file_path : null,
            }
          : prev
      );
      await loadDeliveryReceipts(deliveryExpense.id);
      setDeliveryReceiptMessage({ type: 'success', text: 'Receipt removed' });
      router.refresh();
    } catch {
      setDeliveryReceiptMessage({ type: 'error', text: 'Network error while deleting receipt' });
    } finally {
      setDeliveryReceiptDeletingId(null);
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
          <strong>Delivery paid out</strong>
          <p>{deliveryNum != null && deliveryNum > 0 ? formatThb(deliveryNum) : '—'}</p>
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

      <div style={{ marginTop: 18 }}>
        <h3 className="admin-section-title" style={{ fontSize: 16, marginBottom: 8 }}>
          Receipts · Flowers (shop / COGS)
        </h3>
        <p className="admin-hint" style={{ marginBottom: 8 }}>
          Appears as a <strong>Flowers</strong> expense ({formatThb(displayCogs)}).{' '}
          {cogsExpense?.id ? (
            <Link href={`/admin/expenses/${encodeURIComponent(cogsExpense.id)}`} className="admin-link">
              Open expense
            </Link>
          ) : (
            'Save costs to create this row.'
          )}
        </p>
        <div className="admin-costs-actions" style={{ gap: 10 }}>
          <input
            ref={receiptFlowerInputRef}
            type="file"
            accept="image/*"
            onChange={handleFlowerReceiptFileSelected}
            style={{ display: 'none' }}
            aria-label="Add flowers COGS receipt image"
          />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <button
              type="button"
              className="admin-btn admin-btn-sm admin-btn-outline"
              onClick={() => receiptFlowerInputRef.current?.click()}
              disabled={flowerReceiptBusy || !canEdit}
            >
              {flowerReceiptBusy ? 'Uploading…' : 'Add image'}
            </button>
            {flowerReceiptCount > 0 && cogsExpense?.id && (
              <>
                <button
                  type="button"
                  className="admin-btn admin-btn-sm admin-btn-primary"
                  onClick={() => void handleViewFlowerReceipt()}
                  disabled={loadingFlowerReceipt}
                >
                  {loadingFlowerReceipt ? 'Loading…' : 'View receipt'}
                </button>
                <button
                  type="button"
                  className="admin-btn admin-btn-sm admin-btn-outline"
                  onClick={() => void handleDownloadFlowerReceipt()}
                  disabled={downloadingFlowerReceipt}
                >
                  {downloadingFlowerReceipt ? 'Preparing…' : 'Download'}
                </button>
              </>
            )}
          </div>
          {!cogsExpense?.id && (
            <span className="admin-hint">Save costs first to create the linked Flowers expense.</span>
          )}
        </div>
        {loadingFlowerReceipts ? <p className="admin-hint">Loading images…</p> : null}
        <p className="admin-hint" style={{ marginTop: 4 }}>
          Images: {flowerReceiptCount}
          {currentFlowerReceiptName ? ` · ${currentFlowerReceiptName}` : ''}
        </p>
        {flowerReceiptCount > 0 && cogsExpense?.id ? (
          <div className="admin-expenses-table-wrap" style={{ marginTop: 10 }}>
            <table className="admin-expenses-table">
              <thead>
                <tr>
                  <th>Image name</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {flowerReceipts.map((r) => (
                  <tr key={r.id}>
                    <td>{r.file_name}</td>
                    <td style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className="admin-btn admin-btn-sm admin-btn-outline"
                        onClick={() => { void openReceipt(cogsExpense.id, r.file_path, false); }}
                      >
                        View
                      </button>
                      <button
                        type="button"
                        className="admin-btn admin-btn-sm admin-btn-outline"
                        onClick={() => { void openReceipt(cogsExpense.id, r.file_path, true); }}
                      >
                        Download
                      </button>
                      <button
                        type="button"
                        className="admin-btn admin-btn-sm admin-btn-outline admin-btn-danger"
                        disabled={!canEdit || flowerReceiptDeletingId === r.id}
                        onClick={() => { void handleDeleteFlowerReceipt(r.id); }}
                      >
                        {flowerReceiptDeletingId === r.id ? 'Deleting…' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
        {flowerReceiptMessage && (
          <p className={flowerReceiptMessage.type === 'success' ? 'admin-costs-success' : 'admin-costs-error'}>
            {flowerReceiptMessage.text}
          </p>
        )}
      </div>

      {showDeliveryExpenseBlock ? (
        <div style={{ marginTop: 18 }}>
          <h3 className="admin-section-title" style={{ fontSize: 16, marginBottom: 8 }}>
            Receipts · Delivery (driver)
          </h3>
          <p className="admin-hint" style={{ marginBottom: 8 }}>
            Separate <strong>Delivery</strong> expense ({formatThb(deliveryNum ?? 0)} paid to driver).{' '}
            {deliveryExpense?.id ? (
              <Link href={`/admin/expenses/${encodeURIComponent(deliveryExpense.id)}`} className="admin-link">
                Open expense
              </Link>
            ) : (
              'Save costs to create this row.'
            )}
          </p>
          <div className="admin-costs-actions" style={{ gap: 10 }}>
            <input
              ref={receiptDeliveryInputRef}
              type="file"
              accept="image/*"
              onChange={handleDeliveryReceiptFileSelected}
              style={{ display: 'none' }}
              aria-label="Add delivery driver payment receipt image"
            />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <button
                type="button"
                className="admin-btn admin-btn-sm admin-btn-outline"
                onClick={() => receiptDeliveryInputRef.current?.click()}
                disabled={deliveryReceiptBusy || !canEdit}
              >
                {deliveryReceiptBusy ? 'Uploading…' : 'Add image'}
              </button>
              {deliveryReceiptCount > 0 && deliveryExpense?.id && (
                <>
                  <button
                    type="button"
                    className="admin-btn admin-btn-sm admin-btn-primary"
                    onClick={() => void handleViewDeliveryReceipt()}
                    disabled={loadingDeliveryReceipt}
                  >
                    {loadingDeliveryReceipt ? 'Loading…' : 'View receipt'}
                  </button>
                  <button
                    type="button"
                    className="admin-btn admin-btn-sm admin-btn-outline"
                    onClick={() => void handleDownloadDeliveryReceipt()}
                    disabled={downloadingDeliveryReceipt}
                  >
                    {downloadingDeliveryReceipt ? 'Preparing…' : 'Download'}
                  </button>
                </>
              )}
            </div>
          </div>
          {loadingDeliveryReceipts ? <p className="admin-hint">Loading images…</p> : null}
          <p className="admin-hint" style={{ marginTop: 4 }}>
            Images: {deliveryReceiptCount}
            {currentDeliveryReceiptName ? ` · ${currentDeliveryReceiptName}` : ''}
          </p>
          {deliveryReceiptCount > 0 && deliveryExpense?.id ? (
            <div className="admin-expenses-table-wrap" style={{ marginTop: 10 }}>
              <table className="admin-expenses-table">
                <thead>
                  <tr>
                    <th>Image name</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {deliveryReceipts.map((r) => (
                    <tr key={r.id}>
                      <td>{r.file_name}</td>
                      <td style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          className="admin-btn admin-btn-sm admin-btn-outline"
                          onClick={() => { void openReceipt(deliveryExpense.id, r.file_path, false); }}
                        >
                          View
                        </button>
                        <button
                          type="button"
                          className="admin-btn admin-btn-sm admin-btn-outline"
                          onClick={() => { void openReceipt(deliveryExpense.id, r.file_path, true); }}
                        >
                          Download
                        </button>
                        <button
                          type="button"
                          className="admin-btn admin-btn-sm admin-btn-outline admin-btn-danger"
                          disabled={!canEdit || deliveryReceiptDeletingId === r.id}
                          onClick={() => { void handleDeleteDeliveryReceipt(r.id); }}
                        >
                          {deliveryReceiptDeletingId === r.id ? 'Deleting…' : 'Delete'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          {deliveryReceiptMessage && (
            <p className={deliveryReceiptMessage.type === 'success' ? 'admin-costs-success' : 'admin-costs-error'}>
              {deliveryReceiptMessage.text}
            </p>
          )}
        </div>
      ) : null}

      <p className="admin-hint" style={{ marginTop: 14 }}>
        Receipt images only; large photos are compressed automatically (max {MAX_RECEIPT_UPLOAD_LABEL} per file).
      </p>
    </section>
  );
}
