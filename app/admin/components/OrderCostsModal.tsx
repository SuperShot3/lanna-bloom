'use client';

import type { SupabaseOrderItemRow, SupabaseOrderRow } from '@/lib/supabase/adminQueries';
import type { Expense } from '@/types/expenses';
import { CostsAndProfitCard } from './CostsAndProfitCard';

type LinkedExpenseRef = Pick<Expense, 'id' | 'receipt_attached' | 'receipt_file_path'> | null;

interface OrderCostsModalProps {
  open: boolean;
  onClose: () => void;
  order: SupabaseOrderRow;
  items: SupabaseOrderItemRow[];
  canEdit: boolean;
  initialCogsExpense?: LinkedExpenseRef;
  initialDeliveryExpense?: LinkedExpenseRef;
}

export function OrderCostsModal({
  open,
  onClose,
  order,
  items,
  canEdit,
  initialCogsExpense = null,
  initialDeliveryExpense = null,
}: OrderCostsModalProps) {
  if (!open) return null;

  return (
    <div
      className="admin-modal-backdrop"
      role="dialog"
      aria-modal
      aria-labelledby="order-costs-modal-title"
      onClick={onClose}
    >
      <div
        className="admin-modal admin-modal-wide admin-order-costs-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="admin-order-costs-modal-header">
          <h2 id="order-costs-modal-title" className="admin-section-title" style={{ margin: 0 }}>
            Costs & profit — {order.order_id}
          </h2>
          <button
            type="button"
            className="admin-btn admin-btn-sm admin-btn-outline"
            onClick={onClose}
            aria-label="Close costs dialog"
          >
            Close
          </button>
        </div>
        <CostsAndProfitCard
          order={order}
          items={items}
          canEdit={canEdit}
          initialCogsExpense={initialCogsExpense}
          initialDeliveryExpense={initialDeliveryExpense}
        />
      </div>
    </div>
  );
}
