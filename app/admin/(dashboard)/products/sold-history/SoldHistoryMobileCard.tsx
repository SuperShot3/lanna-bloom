'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ItemHistoryPhotoActions } from '@/app/admin/components/ItemHistoryPhotoActions';
import { formatThb } from '@/lib/costsUtils';
import type {
  SoldProductHistoryGroup,
  SoldProductHistorySaleRow,
} from '@/lib/admin/soldProductsHistoryTypes';
import { SoldHistoryNotesEditor } from './SoldHistoryNotesEditor';
import { SoldHistoryImageGallery } from './SoldHistoryImageGallery';

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

function MobileSalePhotoCard({
  label,
  src,
  emptyText,
  onOpenLightbox,
  editAction,
}: {
  label: string;
  src: string | null;
  emptyText: string;
  onOpenLightbox: (src: string) => void;
  editAction?: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col items-start gap-1.5">
      <span className="text-[11px] text-gray-400">{label}</span>
      {src ? (
        <button
          type="button"
          className="block h-16 w-16 overflow-hidden rounded-lg border border-gray-100 bg-white"
          onClick={() => onOpenLightbox(src)}
          aria-label={`View ${label.toLowerCase()}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- signed/catalog photo thumbnail */}
          <img src={src} alt="" className="h-full w-full object-cover" />
        </button>
      ) : (
        <p className="text-[11px] text-gray-300">{emptyText}</p>
      )}
      {editAction}
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
  const [photosOpen, setPhotosOpen] = useState(false);

  return (
    <div className="flex flex-col gap-2 border-b border-gray-50 pb-2 last:border-0 last:pb-0">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-[13px] font-medium text-gray-800">{formatThb(sale.price)}</span>
          <span className="truncate text-[12px] text-gray-400">
            {formatDate(sale.paid_at)} · {sale.shop_name ?? '—'}
            {sale.recipient_name ? ` · ${sale.recipient_name}` : ''}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <button
            type="button"
            onClick={() => setPhotosOpen((v) => !v)}
            className="text-[12px] font-medium"
            style={{ color: MINT_ICON }}
            aria-expanded={photosOpen}
          >
            {photosOpen ? 'Hide photos' : 'Photos'}
          </button>
          <Link
            href={`/admin/orders/${encodeURIComponent(sale.order_id)}`}
            className="text-[12px] font-medium"
            style={{ color: MINT_ICON }}
          >
            Order
          </Link>
        </div>
      </div>

      {photosOpen ? (
        <div className="flex gap-3 rounded-xl bg-gray-50 p-2.5">
          <MobileSalePhotoCard
            label="Product photo"
            src={sale.image_snapshot}
            emptyText="None recorded"
            onOpenLightbox={onOpenLightbox}
          />
          <MobileSalePhotoCard
            label="Delivered"
            src={sale.delivery_photo_url}
            emptyText="No photo yet"
            onOpenLightbox={onOpenLightbox}
            editAction={
              canEdit ? (
                <ItemHistoryPhotoActions
                  orderId={sale.order_id}
                  itemId={sale.item_id}
                  title="the delivered bouquet"
                  hasPhoto={Boolean(sale.delivery_photo_path)}
                  photoKind="delivery"
                  onPhotoChange={() => router.refresh()}
                />
              ) : undefined
            }
          />
          <MobileSalePhotoCard
            label="Receipt"
            src={sale.purchase_photo_url}
            emptyText="No receipt yet"
            onOpenLightbox={onOpenLightbox}
            editAction={
              canEdit ? (
                <ItemHistoryPhotoActions
                  orderId={sale.order_id}
                  itemId={sale.item_id}
                  title="this sale"
                  hasPhoto={Boolean(sale.purchase_photo_path)}
                  photoKind="purchase"
                  onPhotoChange={() => router.refresh()}
                />
              ) : undefined
            }
          />
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
      <div className="relative flex gap-3 rounded-2xl border border-gray-100 bg-white p-2.5 shadow-[0_1px_4px_rgba(16,24,40,0.04)]">
        <div className="h-[128px] w-[38%] shrink-0 overflow-hidden rounded-xl bg-gray-50">
          {group.thumbnail_url ? (
            <button
              type="button"
              className="block h-full w-full"
              onClick={() => onOpenLightbox(group.thumbnail_url as string)}
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
              aria-label={`Actions for ${group.name}`}
              className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full text-gray-400 hover:bg-gray-50 hover:text-gray-600"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }} aria-hidden>
                more_vert
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => setDetailOpen((v) => !v)}>
              {detailOpen ? 'Hide sale history' : 'View sale history'}
            </DropdownMenuItem>
            {group.thumbnail_url ? (
              <DropdownMenuItem onSelect={() => onOpenLightbox(group.thumbnail_url as string)}>
                View photo
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
            <div className="flex flex-col gap-2">
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

          <div className="border-t border-gray-50 pt-3">
            <SoldHistoryNotesEditor
              entityType={group.entity_type}
              entityId={group.product_id}
              initialNotes={group.sold_history_notes}
              canEdit={canEdit && !group.is_orphaned}
            />
          </div>
          <SoldHistoryImageGallery
            entityType={group.entity_type}
            entityId={group.product_id}
            images={group.sold_history_images}
            canEdit={canEdit && !group.is_orphaned}
          />
          {group.is_orphaned ? (
            <p className="text-[12px] text-gray-400">
              This product is no longer in the catalog, so notes and images can’t be edited here.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
