'use client';

import { useState } from 'react';

interface FiltersBarProps {
  filters: {
    orderId?: string;
    recipientPhone?: string;
    orderStatus?: string;
    paymentStatus?: string;
    district?: string;
    deliveryDateFrom?: string;
    deliveryDateTo?: string;
  };
  districts: string[];
  onFilterChange: (updates: Record<string, string | undefined>) => void;
}

const ORDER_STATUSES = [
  'all',
  'NEW',
  'PAID',
  'ACCEPTED',
  'PREPARING',
  'READY_FOR_DISPATCH',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CANCELED',
  'REFUNDED',
];

export function FiltersBar({ filters, districts, onFilterChange }: FiltersBarProps) {
  const [orderId, setOrderId] = useState(filters.orderId ?? '');
  const [recipientPhone, setRecipientPhone] = useState(filters.recipientPhone ?? '');
  const [expanded, setExpanded] = useState(false);

  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

  const applySearch = () => {
    onFilterChange({
      orderId: orderId.trim() || undefined,
      recipientPhone: recipientPhone.trim() || undefined,
    });
  };

  return (
    <div className="admin-v2-filters">
      <div className="admin-v2-filters-row">
        <input
          type="text"
          placeholder="Search by order ID"
          value={orderId}
          onChange={(e) => setOrderId(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && applySearch()}
          className="admin-v2-input admin-v2-input-search"
        />
        <input
          type="text"
          placeholder="Search by recipient phone"
          value={recipientPhone}
          onChange={(e) => setRecipientPhone(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && applySearch()}
          className="admin-v2-input admin-v2-input-search"
        />
        <button type="button" onClick={applySearch} className="admin-v2-btn">
          Search
        </button>
      </div>

      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="admin-v2-filters-toggle"
      >
        {expanded ? 'Hide filters' : 'Show filters'}
      </button>

      {expanded && (
        <div className="admin-v2-filters-grid">
          <div className="admin-v2-filter-group">
            <label>Status</label>
            <select
              value={filters.orderStatus ?? 'all'}
              onChange={(e) => onFilterChange({ status: e.target.value })}
              className="admin-v2-select"
            >
              {ORDER_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s === 'all' ? 'All' : s.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>
          <div className="admin-v2-filter-group">
            <label>Payment</label>
            <select
              value={filters.paymentStatus ?? 'all'}
              onChange={(e) => onFilterChange({ payment: e.target.value })}
              className="admin-v2-select"
            >
              <option value="all">All</option>
              <option value="paid">Paid</option>
              <option value="unpaid">Unpaid</option>
            </select>
          </div>
          <div className="admin-v2-filter-group">
            <label>District</label>
            <select
              value={filters.district ?? 'all'}
              onChange={(e) => onFilterChange({ district: e.target.value })}
              className="admin-v2-select"
            >
              <option value="all">All</option>
              {districts.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
          <div className="admin-v2-filter-group">
            <label>Delivery date</label>
            <div className="admin-v2-date-btns">
              <button
                type="button"
                onClick={() => onFilterChange({ dateFrom: today, dateTo: today })}
                className="admin-v2-btn admin-v2-btn-sm"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => onFilterChange({ dateFrom: tomorrow, dateTo: tomorrow })}
                className="admin-v2-btn admin-v2-btn-sm"
              >
                Tomorrow
              </button>
              <input
                type="date"
                value={filters.deliveryDateFrom ?? ''}
                onChange={(e) => onFilterChange({ dateFrom: e.target.value || undefined })}
                className="admin-v2-input admin-v2-input-date"
              />
              <span>–</span>
              <input
                type="date"
                value={filters.deliveryDateTo ?? ''}
                onChange={(e) => onFilterChange({ dateTo: e.target.value || undefined })}
                className="admin-v2-input admin-v2-input-date"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
