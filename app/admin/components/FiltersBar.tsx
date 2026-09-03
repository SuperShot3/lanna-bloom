'use client';

import { ORDER_STATUS, ORDER_STATUS_LABELS } from '@/lib/orders/statusConstants';

interface FiltersBarProps {
  filters: {
    orderId?: string;
    recipientPhone?: string;
    orderStatus?: string;
    paymentStatus?: string;
    district?: string;
    deliveryDestination?: string;
    deliveryDateFrom?: string;
    deliveryDateTo?: string;
  };
  districts: string[];
  /** Distinct delivery_destination values from orders (plus All). */
  deliveryDestinations: string[];
  onFilterChange: (updates: Record<string, string | undefined>) => void;
}

const ORDER_STATUSES = ['all', ...ORDER_STATUS];

export function FiltersBar({
  filters,
  districts,
  deliveryDestinations,
  onFilterChange,
}: FiltersBarProps) {
  return (
    <div className="admin-filters">
      <div className="admin-filters-grid">
        <div className="admin-filter-group">
          <label>Status</label>
          <select
            value={filters.orderStatus ?? 'all'}
            onChange={(e) => onFilterChange({ status: e.target.value })}
            className="admin-select"
          >
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s === 'all' ? 'All' : ORDER_STATUS_LABELS[s as keyof typeof ORDER_STATUS_LABELS]}
              </option>
            ))}
          </select>
        </div>
        <div className="admin-filter-group">
          <label>Payment</label>
          <select
            value={filters.paymentStatus ?? 'all'}
            onChange={(e) => onFilterChange({ payment: e.target.value })}
            className="admin-select"
          >
            <option value="all">All</option>
            <option value="paid">Paid</option>
            <option value="unpaid">Unpaid</option>
          </select>
        </div>
        <div className="admin-filter-group">
          <label>Destination</label>
          <select
            value={filters.deliveryDestination ?? 'all'}
            onChange={(e) => onFilterChange({ destination: e.target.value })}
            className="admin-select"
          >
            <option value="all">All</option>
            {deliveryDestinations.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
        <div className="admin-filter-group">
          <label>District (legacy)</label>
          <select
            value={filters.district ?? 'all'}
            onChange={(e) => onFilterChange({ district: e.target.value })}
            className="admin-select"
          >
            <option value="all">All</option>
            {districts.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
