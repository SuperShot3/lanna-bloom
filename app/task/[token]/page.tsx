import type { Metadata } from 'next';
import { unstable_noStore } from 'next/cache';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import {
  isActiveSupplierRequestStatus,
  isSupplierRequestExpired,
  parseSupplierProductSnapshot,
  type SupplierMessageCardSnapshot,
  type SupplierPreparationSnapshot,
} from '@/lib/supplierRequests';
import { buildSupplierTaskMetadata } from '@/lib/supplierTaskMetadata';
import { SupplierResponseForm } from './SupplierResponseForm';
import { SupplierTaskUnavailable } from './SupplierTaskUnavailable';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface PageProps {
  params: Promise<{ token: string }>;
}

function unavailableBlock() {
  return <SupplierTaskUnavailable />;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  unstable_noStore();
  const { token } = await params;
  const publicToken = token?.trim() ?? '';

  if (!publicToken) {
    return buildSupplierTaskMetadata({
      token: '',
      status: null,
      expiresAt: null,
      productSnapshot: null,
    });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return buildSupplierTaskMetadata({
      token: publicToken,
      status: null,
      expiresAt: null,
      productSnapshot: null,
    });
  }

  const { data, error } = await supabase
    .from('supplier_order_requests')
    .select('status, expires_at, product_snapshot')
    .eq('public_token', publicToken)
    .maybeSingle();

  if (error || !data) {
    return buildSupplierTaskMetadata({
      token: publicToken,
      status: null,
      expiresAt: null,
      productSnapshot: null,
    });
  }

  return buildSupplierTaskMetadata({
    token: publicToken,
    status: data.status,
    expiresAt: data.expires_at,
    productSnapshot: data.product_snapshot,
  });
}

function asPreparationSnapshot(value: unknown): SupplierPreparationSnapshot {
  if (!value || typeof value !== 'object') return {};
  return value as SupplierPreparationSnapshot;
}

function asMessageCardSnapshot(value: unknown): SupplierMessageCardSnapshot {
  if (!value || typeof value !== 'object') return { cards: [] };
  const raw = value as Partial<SupplierMessageCardSnapshot>;
  return {
    cards: Array.isArray(raw.cards) ? raw.cards : [],
    customGreetingCard: raw.customGreetingCard ?? null,
  };
}

export default async function SupplierTaskPage({ params }: PageProps) {
  unstable_noStore();
  const { token } = await params;
  const publicToken = token?.trim();
  if (!publicToken) return unavailableBlock();

  const supabase = getSupabaseAdmin();
  if (!supabase) return unavailableBlock();

  const { data: requestRow, error } = await supabase
    .from('supplier_order_requests')
    .select('*')
    .eq('public_token', publicToken)
    .maybeSingle();

  if (error || !requestRow) return unavailableBlock();

  if (isSupplierRequestExpired(requestRow.expires_at)) {
    if (isActiveSupplierRequestStatus(requestRow.status)) {
      await supabase
        .from('supplier_order_requests')
        .update({ status: 'EXPIRED' })
        .eq('id', requestRow.id);
      await supabase.from('supplier_order_request_events').insert({
        request_id: requestRow.id,
        order_id: requestRow.order_id,
        event_type: 'EXPIRED',
        event_message: 'Supplier link expired',
        created_by: 'supplier_page',
      });
    }
    return unavailableBlock();
  }

  if (!isActiveSupplierRequestStatus(requestRow.status)) {
    return unavailableBlock();
  }

  if (!requestRow.opened_at || requestRow.status === 'LINK_CREATED' || requestRow.status === 'LINK_SENT') {
    const nowIso = new Date().toISOString();
    await supabase
      .from('supplier_order_requests')
      .update({
        status: 'LINK_OPENED',
        opened_at: requestRow.opened_at ?? nowIso,
      })
      .eq('id', requestRow.id);
    await supabase.from('supplier_order_request_events').insert({
      request_id: requestRow.id,
      order_id: requestRow.order_id,
      event_type: 'LINK_OPENED',
      event_message: 'Supplier opened the request',
      created_by: 'supplier',
    });
  }

  return (
    <SupplierResponseForm
      token={publicToken}
      product={parseSupplierProductSnapshot(requestRow.product_snapshot)}
      preparation={asPreparationSnapshot(requestRow.preparation_snapshot)}
      messageCard={asMessageCardSnapshot(requestRow.message_card_snapshot)}
    />
  );
}
