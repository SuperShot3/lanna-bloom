'use client';

import { useCallback, useEffect, useMemo, useRef, useState, Fragment } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { computeProfit, formatThb } from '@/lib/costsUtils';
import type { SupabaseOrderRow, SupabaseOrderItemRow } from '@/lib/supabase/adminQueries';
import type { Expense, ExpenseReceiptImage } from '@/types/expenses';
import { confirmDeleteAction } from '@/app/admin/components/confirmDelete';
import { useMissingCogsSummary } from '@/app/admin/components/MissingCogsNotice';
import { ItemPurchaseHistoryPanel } from '@/app/admin/components/ItemPurchaseHistoryPanel';
import { ItemCogsPhoto } from '@/app/admin/components/ItemCogsPhoto';
import {
  findPartnerShop,
  findPartnerShopByName,
  useCatalogPartnerShops,
} from '@/app/admin/components/useCatalogPartnerShops';
import { compressReceiptImageForUpload } from '@/lib/receiptImageCompress';
import { isReceiptImageFile } from '@/lib/isReceiptImageFile';
import { MAX_RECEIPT_UPLOAD_BYTES, MAX_RECEIPT_UPLOAD_LABEL } from '@/lib/receiptUploadLimits';
import type { CatalogPartnerShop } from '@/lib/admin/catalogPartnerShopTypes';
import type {
  ItemPurchaseHistoryResponse,
  ItemPurchaseHistoryRow,
} from '@/lib/admin/itemPurchaseHistoryTypes';
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
  const t = s.trim().replace(',', '.');
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

function historyCacheKey(bouquetId: string, size: string | null | undefined): string {
  return `${bouquetId.trim()}::${(size ?? '').trim()}`;
}

function defaultSourceShopId(
  item: SupabaseOrderItemRow,
  order: SupabaseOrderRow,
  shops: CatalogPartnerShop[]
): string {
  const saved = item.source_shop_id?.trim();
  if (saved) return saved;
  const confirmed = order.confirmed_shop_id?.trim();
  if (confirmed) return confirmed;
  const match = findPartnerShopByName(shops, order.confirmed_supplier_shop_name);
  if (match) return match.id;
  return '';
}

export function CostsAndProfitCard({
  order,
  items = [],
  canEdit = true,
  initialCogsExpense = null,
  initialDeliveryExpense = null,
}: CostsAndProfitCardProps) {
  const router = useRouter();
  const partnerShops = useCatalogPartnerShops();
  const { refresh: refreshMissingCogs } = useMissingCogsSummary();
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

  const itemShopStateInit = useMemo(() => {
    const map: Record<string, string> = {};
    for (const it of items) {
      const id = it.id;
      if (id == null) continue;
      map[String(id)] = defaultSourceShopId(it, order, partnerShops);
    }
    return map;
  }, [items, order, partnerShops]);
  const [itemShops, setItemShops] = useState<Record<string, string>>(itemShopStateInit);
  useEffect(() => {
    setItemShops((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const it of items) {
        if (it.id == null) continue;
        const id = String(it.id);
        if (next[id]) continue;
        const fallback = defaultSourceShopId(it, order, partnerShops);
        if (!fallback) continue;
        next[id] = fallback;
        changed = true;
      }
      return changed ? next : prev;
    });
  }, [items, order, partnerShops]);
  const [openHistoryKey, setOpenHistoryKey] = useState<string | null>(null);
  const [historyByKey, setHistoryByKey] = useState<
    Record<string, ItemPurchaseHistoryResponse | { error: string } | 'loading'>
  >({});
  const historyFetchedRef = useRef<Set<string>>(new Set());

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
  const effectiveCogsNum =
    usingPerItem && (computedCogsFromItems ?? 0) > 0
      ? computedCogsFromItems
      : parseInput(cogs);

  useEffect(() => {
    if (!usingPerItem) return;
    if (computedCogsFromItems != null && computedCogsFromItems > 0) {
      setCogs(toInputValue(computedCogsFromItems));
    }
  }, [computedCogsFromItems, usingPerItem]);

  const applyManualCogs = (raw: string) => {
    setCogs(raw);
    const withIds = items.filter((it) => it.id != null);
    if (withIds.length !== 1) return;
    const onlyId = String(withIds[0].id);
    setItemCosts((prev) => ({ ...prev, [onlyId]: raw }));
  };

  const loadItemHistory = useCallback(async (bouquetId: string, size: string | null | undefined) => {
    const key = historyCacheKey(bouquetId, size);
    if (historyFetchedRef.current.has(key)) return;
    historyFetchedRef.current.add(key);
    setHistoryByKey((prev) => ({ ...prev, [key]: 'loading' }));
    try {
      const q = new URLSearchParams({ bouquet_id: bouquetId.trim() });
      const sizeTrim = (size ?? '').trim();
      if (sizeTrim) q.set('size', sizeTrim);
      q.set('exclude_order_id', order.order_id);
      const res = await fetch(`/api/admin/orders/item-purchase-history?${q.toString()}`, {
        cache: 'no-store',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        historyFetchedRef.current.delete(key);
        setHistoryByKey((prev) => ({
          ...prev,
          [key]: { error: typeof data.error === 'string' ? data.error : 'Failed to load history' },
        }));
        return;
      }
      setHistoryByKey((prev) => ({ ...prev, [key]: data as ItemPurchaseHistoryResponse }));
    } catch {
      historyFetchedRef.current.delete(key);
      setHistoryByKey((prev) => ({ ...prev, [key]: { error: 'Network error loading history' } }));
    }
  }, [order.order_id]);

  useEffect(() => {
    for (const it of items) {
      const bid = it.bouquet_id?.trim();
      if (!bid) continue;
      void loadItemHistory(bid, it.size);
    }
  }, [items, loadItemHistory]);

  const applyHistoryRow = (itemId: string, row: ItemPurchaseHistoryRow) => {
    setItemCosts((prev) => ({ ...prev, [itemId]: String(row.cost) }));
    const byId = findPartnerShop(partnerShops, row.shop_id);
    if (byId) {
      setItemShops((prev) => ({ ...prev, [itemId]: byId.id }));
      return;
    }
    const byName = findPartnerShopByName(partnerShops, row.shop_name);
    if (byName) setItemShops((prev) => ({ ...prev, [itemId]: byName.id }));
  };

  const displayCogs = effectiveCogsNum ?? 0;

  const initialCogs = toInputValue(effectiveInitialCogs);
  const initialDelivery = toInputValue(order.delivery_cost);
  const initialPayment = toInputValue(order.payment_fee);

  const hasChanges =
    cogs !== initialCogs ||
    deliveryCost !== initialDelivery ||
    paymentFee !== initialPayment ||
    (usingPerItem && JSON.stringify(itemCosts) !== JSON.stringify(itemCostStateInit)) ||
    (usingPerItem && JSON.stringify(itemShops) !== JSON.stringify(itemShopStateInit));

  const cogsNum = effectiveCogsNum;
  const deliveryNum = parseInput(deliveryCost);
  const paymentNum = parseInput(paymentFee);
  const showDeliveryExpenseBlock = deliveryNum != null && deliveryNum > 0;

  const profit = computeProfit(totalAmount, cogsNum, deliveryNum, paymentNum);
  // Partner/item costs can prefill the UI without persisting orders.cogs_amount.
  const cogsPersisted = order.cogs_amount != null && Number(order.cogs_amount) > 0;
  const needsConfirm = !cogsPersisted && cogsNum != null && cogsNum > 0;
  const canSave = hasChanges || needsConfirm;

  const handleSave = async () => {
    if (!canSave || saving) return;
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
          .map((it) => {
            const rawShop = (itemShops[String(it.id)] ?? '').trim();
            const entry: { id: typeof it.id; cost: number | null; source_shop_id?: string | null } = {
              id: it.id,
              cost: parseInput(itemCosts[String(it.id)] ?? ''),
            };
            if (!rawShop || findPartnerShop(partnerShops, rawShop)) {
              entry.source_shop_id = rawShop || null;
            }
            return entry;
          });
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
      refreshMissingCogs();
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

      {!cogsPersisted && (
        <p className="admin-costs-warning">
          {needsConfirm
            ? 'Item costs are prefilled but not saved yet — click Confirm & save COGS to clear the missing-COGS alert.'
            : 'Costs not set (profit is estimated)'}
        </p>
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
                  <th>Photo</th>
                  <th>Item</th>
                  <th className="admin-expenses-col-amount">Sell price</th>
                  <th className="admin-expenses-col-amount">Cost</th>
                  <th>Bought from</th>
                  <th>History</th>
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
                  const shopValue = it.id != null ? (itemShops[String(it.id)] ?? '') : '';
                  const bouquetId = it.bouquet_id?.trim() ?? '';
                  const histKey = bouquetId ? historyCacheKey(bouquetId, it.size) : '';
                  const histState = histKey ? historyByKey[histKey] : undefined;
                  const histData =
                    histState && histState !== 'loading' && !('error' in histState) ? histState : null;
                  const lastHint =
                    !value && histData?.summary.last_cost != null
                      ? `Last: ${formatThb(histData.summary.last_cost)}${
                          histData.summary.last_shop_name ? ` at ${histData.summary.last_shop_name}` : ''
                        }`
                      : null;
                  const historyOpen = Boolean(histKey) && openHistoryKey === histKey;
                  const extraShop =
                    shopValue && !findPartnerShop(partnerShops, shopValue)
                      ? { id: shopValue, name: it.source_shop_name?.trim() || shopValue }
                      : null;
                  return (
                    <Fragment key={rowKey}>
                      <tr>
                        <td>
                          <ItemCogsPhoto
                            orderId={order.order_id}
                            itemId={it.id}
                            title={`${title}${size}`}
                            catalogImageUrl={it.image_url_snapshot}
                            purchasePhotoPath={it.purchase_photo_path}
                            canEdit={canEditItem}
                          />
                        </td>
                        <td>{title}{size}</td>
                        <td className="admin-expenses-amount">{sell != null ? formatThb(sell) : '—'}</td>
                        <td className="admin-expenses-amount">
                          {canEditItem ? (
                            <>
                              <input
                                type="text"
                                inputMode="decimal"
                                autoComplete="off"
                                className="admin-input"
                                style={{ maxWidth: 140 }}
                                value={value}
                                onChange={(e) => setItemCosts((prev) => ({ ...prev, [String(it.id)]: e.target.value }))}
                                onBlur={(e) => {
                                  const v = e.target.value.trim();
                                  if (v === '') return;
                                  const n = parseFloat(v.replace(',', '.'));
                                  if (!Number.isNaN(n) && n >= 0) {
                                    setItemCosts((prev) => ({ ...prev, [String(it.id)]: String(Math.round(n * 100) / 100) }));
                                  }
                                }}
                                placeholder={
                                  histData?.summary.last_cost != null
                                    ? String(histData.summary.last_cost)
                                    : '0'
                                }
                                aria-label={`Cost for ${title}${size}`}
                              />
                              {lastHint ? <span className="admin-costs-last-hint">{lastHint}</span> : null}
                            </>
                          ) : (
                            formatThb(it.cost ?? null)
                          )}
                        </td>
                        <td>
                          {canEditItem ? (
                            <>
                              <select
                                className="admin-input admin-costs-shop-select"
                                value={shopValue}
                                onChange={(e) =>
                                  setItemShops((prev) => ({ ...prev, [String(it.id)]: e.target.value }))
                                }
                                aria-label={`Bought from for ${title}${size}`}
                              >
                                <option value="">Select shop</option>
                                {extraShop ? (
                                  <option value={extraShop.id}>{extraShop.name}</option>
                                ) : null}
                                {partnerShops.map((shop) => (
                                  <option key={shop.id} value={shop.id}>
                                    {shop.name}
                                  </option>
                                ))}
                              </select>
                              {!shopValue ? (
                                <span className="admin-costs-last-hint">Shop not set</span>
                              ) : null}
                            </>
                          ) : (
                            it.source_shop_name?.trim() ||
                            order.confirmed_supplier_shop_name?.trim() ||
                            '—'
                          )}
                        </td>
                        <td>
                          {bouquetId ? (
                            <button
                              type="button"
                              className="admin-btn admin-btn-sm admin-btn-outline"
                              onClick={() => {
                                void loadItemHistory(bouquetId, it.size);
                                setOpenHistoryKey((prev) => (prev === histKey ? null : histKey));
                              }}
                            >
                              {historyOpen ? 'Hide' : 'History'}
                            </button>
                          ) : (
                            <span className="admin-hint">No catalog id</span>
                          )}
                        </td>
                      </tr>
                      {bouquetId ? (
                        <tr>
                          <td colSpan={6} style={{ padding: historyOpen ? undefined : 0, borderBottom: historyOpen ? undefined : 'none' }}>
                            <ItemPurchaseHistoryPanel
                              open={historyOpen}
                              loading={histState === 'loading'}
                              error={
                                histState && histState !== 'loading' && 'error' in histState
                                  ? histState.error
                                  : null
                              }
                              data={histData}
                              canApply={canEditItem}
                              onApply={(row) => {
                                if (it.id == null) return;
                                applyHistoryRow(String(it.id), row);
                              }}
                            />
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
          {usingPerItem && (
            <p className="admin-hint" style={{ marginTop: 8 }}>
              Total COGS is calculated from item costs when those are filled. You can also type COGS
              below by hand. Shop is optional. Tap a photo to view it large.
            {partnerShops.length === 0
              ? ' Partner list is empty — add shops under Partners.'
              : ''}
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
            <label htmlFor="cogs-amount">COGS (฿)</label>
            {canEdit ? (
              <input
                id="cogs-amount"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                value={cogs}
                onChange={(e) => applyManualCogs(e.target.value)}
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  if (v === '') {
                    applyManualCogs('');
                    return;
                  }
                  const n = parseFloat(v.replace(',', '.'));
                  if (!Number.isNaN(n) && n >= 0) {
                    applyManualCogs(String(Math.round(n * 100) / 100));
                  }
                }}
                placeholder="0"
                className="admin-input"
                aria-label="Cost of goods paid"
              />
            ) : (
              <p>{cogs || '—'}</p>
            )}
          </div>
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
            disabled={!canSave || saving}
            className="admin-btn"
          >
            {saving ? 'Saving…' : needsConfirm ? 'Confirm & save COGS' : 'Save costs'}
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
