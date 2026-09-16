'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { confirmDeleteAction } from '@/app/admin/components/confirmDelete';
import { compressReceiptImageForUpload } from '@/lib/receiptImageCompress';
import { isReceiptImageFile } from '@/lib/isReceiptImageFile';
import { MAX_RECEIPT_IMAGES_PER_EXPENSE, MAX_RECEIPT_UPLOAD_BYTES } from '@/lib/receiptUploadLimits';
import { formatThb } from '@/lib/costsUtils';
import type {
  SoldProductHistoryGroup,
  SoldProductHistorySaleRow,
  SoldSaleExpense,
} from '@/lib/admin/soldProductsHistoryTypes';

const MINT_ICON = '#4C9A7C';

interface SoldHistoryMobileCardProps {
  group: SoldProductHistoryGroup;
  canEdit: boolean;
  soldCount: number;
  lastPrice: number | null;
  lastSoldAt: string | null;
  onOpenLightbox: (src: string) => void;
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function InfoRow({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="flex items-center gap-1.5 text-[12.5px] text-gray-500">
      <span
        className="material-symbols-outlined shrink-0"
        style={{ fontSize: 15, color: MINT_ICON }}
        aria-hidden
      >
        {icon}
      </span>
      <span className="truncate">{text}</span>
    </div>
  );
}

function MobileSaleThumb({
  label,
  src,
  onOpenLightbox,
}: {
  label: string;
  src: string | null;
  onOpenLightbox: (src: string) => void;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      {src ? (
        <button
          type="button"
          className="block h-12 w-12 overflow-hidden rounded-lg border border-gray-100 bg-white"
          onClick={() => onOpenLightbox(src)}
          aria-label={`View ${label.toLowerCase()}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- signed/catalog photo thumbnail */}
          <img src={src} alt="" className="h-full w-full object-cover" />
        </button>
      ) : (
        <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50">
          <span className="material-symbols-outlined text-gray-300" style={{ fontSize: 16 }} aria-hidden>
            add_photo_alternate
          </span>
        </div>
      )}
      <span className="text-[10px] leading-none text-gray-400">{label}</span>
    </div>
  );
}

/** Add/view/delete receipt photos for one expense linked to this order. */
function MobileExpenseReceipts({
  expense,
  canEdit,
  onOpenLightbox,
}: {
  expense: SoldSaleExpense;
  canEdit: boolean;
  onOpenLightbox: (src: string) => void;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const atLimit = expense.images.length >= MAX_RECEIPT_IMAGES_PER_EXPENSE;

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    if (inputRef.current) inputRef.current.value = '';
    if (!file) return;
    setError(null);
    if (!isReceiptImageFile(file)) {
      setError('Only image files are allowed.');
      return;
    }
    setBusy(true);
    try {
      const fileToUpload = await compressReceiptImageForUpload(file, MAX_RECEIPT_UPLOAD_BYTES);
      const formData = new FormData();
      formData.append('file', fileToUpload);
      const res = await fetch(
        `/api/admin/expenses/${encodeURIComponent(expense.expense_id)}/receipts`,
        { method: 'POST', body: formData }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Upload failed');
        return;
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (imageId: string) => {
    if (!confirmDeleteAction('Remove this receipt image?')) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/expenses/${encodeURIComponent(expense.expense_id)}/receipts/${encodeURIComponent(imageId)}`,
        { method: 'DELETE' }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Remove failed');
        return;
      }
      router.refresh();
    } catch {
      setError('Remove failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11.5px] text-gray-500">
          Receipt · {expense.category}
          {expense.amount != null ? ` (${formatThb(expense.amount)})` : ''}
        </span>
        {canEdit ? (
          <>
            <input
              ref={inputRef}
              type="file"
              accept="image/*,.heic,.heif"
              onChange={handleFile}
              disabled={busy || atLimit}
              className="hidden"
              aria-label={`Add receipt photo for ${expense.category}`}
            />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={busy || atLimit}
              className="shrink-0 text-[11.5px] font-medium disabled:opacity-50"
              style={{ color: MINT_ICON }}
            >
              {busy ? 'Uploading…' : atLimit ? 'Max reached' : 'Add photo'}
            </button>
          </>
        ) : null}
      </div>

      {expense.images.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {expense.images.map((image) => (
            <div key={image.id} className="relative">
              <button
                type="button"
                className="block h-12 w-12 overflow-hidden rounded-lg border border-gray-100 bg-white"
                onClick={() => onOpenLightbox(image.url)}
                aria-label={`View ${expense.category} receipt`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- signed expense receipt */}
                <img src={image.url} alt="" className="h-full w-full object-cover" />
              </button>
              {canEdit ? (
                <button
                  type="button"
                  onClick={() => handleDelete(image.id)}
                  disabled={busy}
                  aria-label="Delete receipt image"
                  className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full border border-gray-200 bg-white text-red-500"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 10 }} aria-hidden>
                    close
                  </span>
                </button>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[11px] text-gray-300">No receipt image yet.</p>
      )}

      {error ? <p className="text-[11px] text-red-500">{error}</p> : null}
    </div>
  );
}

/** A single-photo slot (delivered bouquet / purchase photo), styled to match MobileExpenseReceipts. */
function MobileSinglePhotoSlot({
  orderId,
  itemId,
  photoKind,
  label,
  src,
  onOpenLightbox,
}: {
  orderId: string;
  itemId: string;
  photoKind: 'purchase' | 'delivery';
  label: string;
  src: string | null;
  onOpenLightbox: (src: string) => void;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endpoint = photoKind === 'delivery' ? 'delivery-photo' : 'purchase-photo';

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    if (inputRef.current) inputRef.current.value = '';
    if (!file) return;
    setError(null);
    if (!isReceiptImageFile(file)) {
      setError('Only image files are allowed.');
      return;
    }
    setBusy(true);
    try {
      const fileToUpload = await compressReceiptImageForUpload(file, MAX_RECEIPT_UPLOAD_BYTES);
      const formData = new FormData();
      formData.append('file', fileToUpload);
      const res = await fetch(
        `/api/admin/orders/${encodeURIComponent(orderId)}/items/${encodeURIComponent(itemId)}/${endpoint}`,
        { method: 'POST', body: formData }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Upload failed');
        return;
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async () => {
    if (!confirmDeleteAction(`Remove this ${label.toLowerCase()}?`)) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/orders/${encodeURIComponent(orderId)}/items/${encodeURIComponent(itemId)}/${endpoint}`,
        { method: 'DELETE' }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Remove failed');
        return;
      }
      router.refresh();
    } catch {
      setError('Remove failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11.5px] text-gray-500">{label}</span>
        <input
          ref={inputRef}
          type="file"
          accept="image/*,.heic,.heif"
          onChange={handleFile}
          disabled={busy}
          className="hidden"
          aria-label={`Add ${label.toLowerCase()}`}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="shrink-0 text-[11.5px] font-medium disabled:opacity-50"
          style={{ color: MINT_ICON }}
        >
          {busy ? 'Uploading…' : src ? 'Replace photo' : 'Add photo'}
        </button>
      </div>

      {src ? (
        <div className="relative w-fit">
          <button
            type="button"
            className="block h-12 w-12 overflow-hidden rounded-lg border border-gray-100 bg-white"
            onClick={() => onOpenLightbox(src)}
            aria-label={`View ${label.toLowerCase()}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- signed ops photo */}
            <img src={src} alt="" className="h-full w-full object-cover" />
          </button>
          <button
            type="button"
            onClick={handleRemove}
            disabled={busy}
            aria-label={`Remove ${label.toLowerCase()}`}
            className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full border border-gray-200 bg-white text-red-500"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 10 }} aria-hidden>
              close
            </span>
          </button>
        </div>
      ) : (
        <p className="text-[11px] text-gray-300">No photo yet.</p>
      )}

      {error ? <p className="text-[11px] text-red-500">{error}</p> : null}
    </div>
  );
}

function MobileSaleRow({
  sale,
  canEdit,
  onOpenLightbox,
}: {
  sale: SoldProductHistorySaleRow;
  canEdit: boolean;
  onOpenLightbox: (src: string) => void;
}) {
  const router = useRouter();
  const [manageOpen, setManageOpen] = useState(false);

  return (
    <div className="flex flex-col gap-2.5 rounded-xl border border-gray-200 bg-white p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-0.5">
          <div className="flex items-baseline gap-2">
            <span className="text-[13px] font-medium text-gray-800">{formatThb(sale.price)}</span>
            <span className="text-[11.5px] text-gray-400">COGS {formatThb(sale.cost)}</span>
          </div>
          <span className="truncate text-[12px] text-gray-400">
            {formatDate(sale.paid_at)} · {sale.shop_name ?? '—'}
            {sale.recipient_name ? ` · ${sale.recipient_name}` : ''}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href={`/admin/orders/${encodeURIComponent(sale.order_id)}`}
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[11.5px] font-semibold"
            style={{ color: '#2F6B52', backgroundColor: '#E8F4EC' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 14 }} aria-hidden>
              open_in_new
            </span>
            Order
          </Link>
          {canEdit ? (
            <button
              type="button"
              onClick={() => setManageOpen((v) => !v)}
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[11.5px] font-semibold ${
                manageOpen
                  ? 'bg-amber-100 text-amber-700'
                  : 'border border-amber-200 bg-white text-amber-600'
              }`}
              aria-expanded={manageOpen}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 14 }} aria-hidden>
                {manageOpen ? 'check' : 'edit'}
              </span>
              {manageOpen ? 'Done' : 'Edit'}
            </button>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl bg-gray-50 px-2.5 py-2">
        <MobileSaleThumb
          label="Product"
          src={sale.image_snapshot}
          onOpenLightbox={onOpenLightbox}
        />
        <MobileSaleThumb
          label="Purchase"
          src={sale.purchase_photo_url}
          onOpenLightbox={onOpenLightbox}
        />
        {sale.expenses.flatMap((expense) =>
          expense.images.map((image) => (
            <MobileSaleThumb
              key={image.id}
              label={expense.category}
              src={image.url}
              onOpenLightbox={onOpenLightbox}
            />
          ))
        )}
      </div>

      {manageOpen && canEdit ? (
        <div className="flex flex-col gap-3 rounded-xl border border-gray-100 p-2.5">
          <MobileSinglePhotoSlot
            orderId={sale.order_id}
            itemId={sale.item_id}
            photoKind="purchase"
            label="Purchase photo"
            src={sale.purchase_photo_url}
            onOpenLightbox={onOpenLightbox}
          />

          {sale.expenses.length > 0 ? (
            sale.expenses.map((expense) => (
              <div key={expense.expense_id} className="border-t border-gray-50 pt-2">
                <MobileExpenseReceipts
                  expense={expense}
                  canEdit={canEdit}
                  onOpenLightbox={onOpenLightbox}
                />
              </div>
            ))
          ) : (
            <p className="border-t border-gray-50 pt-2 text-[11px] text-gray-400">
              No expenses linked to this order yet.{' '}
              <Link
                href={`/admin/orders/${encodeURIComponent(sale.order_id)}`}
                className="font-medium"
                style={{ color: MINT_ICON }}
              >
                Add in Costs &amp; profit
              </Link>
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}

export function SoldHistoryMobileCard({
  group,
  canEdit,
  soldCount,
  lastPrice,
  lastSoldAt,
  onOpenLightbox,
}: SoldHistoryMobileCardProps) {
  const [detailOpen, setDetailOpen] = useState(false);

  return (
    <div className="flex flex-col gap-2">
      <div
        role="button"
        tabIndex={0}
        aria-expanded={detailOpen}
        aria-label={`${detailOpen ? 'Hide' : 'View'} sale history for ${group.name}`}
        onClick={() => setDetailOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setDetailOpen((v) => !v);
          }
        }}
        className="relative flex cursor-pointer gap-3 rounded-2xl border border-gray-100 bg-white p-2.5 shadow-[0_1px_4px_rgba(16,24,40,0.04)] active:bg-gray-50"
      >
        <div className="h-[128px] w-[38%] shrink-0 overflow-hidden rounded-xl bg-gray-50">
          {group.thumbnail_url ? (
            <button
              type="button"
              className="block h-full w-full"
              onClick={(e) => {
                e.stopPropagation();
                onOpenLightbox(group.thumbnail_url as string);
              }}
              aria-label={`View photo for ${group.name}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={group.thumbnail_url} alt="" className="h-full w-full object-cover" />
            </button>
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <span className="material-symbols-outlined text-gray-300" aria-hidden>
                image
              </span>
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col justify-center gap-2 py-1 pr-6">
          <h3 className="truncate text-[15px] font-semibold leading-snug text-gray-900">
            {group.name}
            {group.is_orphaned ? (
              <span className="ml-1 text-[11px] font-normal text-gray-400">· archived</span>
            ) : null}
          </h3>
          <div className="flex flex-col gap-1">
            <InfoRow icon="sell" text={`${soldCount} sold`} />
            <InfoRow icon="payments" text={`${formatThb(lastPrice)} last price`} />
            <InfoRow icon="calendar_month" text={`${formatDate(lastSoldAt)} last sold`} />
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={`More actions for ${group.name}`}
              onClick={(e) => e.stopPropagation()}
              className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full text-gray-400 hover:bg-gray-50 hover:text-gray-600"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }} aria-hidden>
                more_vert
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            {group.thumbnail_url ? (
              <DropdownMenuItem onSelect={() => onOpenLightbox(group.thumbnail_url as string)}>
                View photo
              </DropdownMenuItem>
            ) : null}
            {!group.is_orphaned ? (
              <DropdownMenuItem asChild>
                <Link
                  href={
                    group.entity_type === 'bouquet'
                      ? `/admin/products/bouquet/${group.product_id}`
                      : `/admin/products/product/${group.product_id}`
                  }
                >
                  Edit product
                </Link>
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {detailOpen ? (
        <div className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-3.5">
          <div className="flex items-center justify-between">
            <h4 className="text-[13px] font-semibold text-gray-700">Sale history</h4>
            <button
              type="button"
              onClick={() => setDetailOpen(false)}
              className="flex h-6 w-6 items-center justify-center rounded-full text-gray-400 hover:bg-gray-50"
              aria-label="Close sale history"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16 }} aria-hidden>
                close
              </span>
            </button>
          </div>

          {group.history.length === 0 ? (
            <p className="text-[13px] text-gray-400">No sales recorded.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {group.history.map((sale, idx) => (
                <MobileSaleRow
                  key={`${sale.order_id}-${sale.item_id}-${idx}`}
                  sale={sale}
                  canEdit={canEdit}
                  onOpenLightbox={onOpenLightbox}
                />
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
