'use client';

import type { ExpenseCategoryTotal } from '@/lib/expenses/expenseCategoryQueries';

function formatAmount(amount: number, currency = 'THB') {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

const RADIUS = 70;
const STROKE = 22;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

interface Props {
  totals: ExpenseCategoryTotal[];
  grandTotal: number;
  periodLabel: string;
  onManageCategories: () => void;
}

export function ExpenseCategoryBreakdown({ totals, grandTotal, periodLabel, onManageCategories }: Props) {
  let cumulative = 0;
  const segments = totals.map((t) => {
    const dash = t.percent * CIRCUMFERENCE;
    const seg = {
      value: t.value,
      color: t.color,
      strokeDasharray: `${dash} ${CIRCUMFERENCE - dash}`,
      strokeDashoffset: -cumulative,
    };
    cumulative += dash;
    return seg;
  });

  return (
    <div className="admin-expenses-category-card">
      <div className="admin-expenses-category-head">
        <div>
          <h2 className="admin-accounting-section-title">Expenses by Category</h2>
          <p className="admin-hint admin-expenses-category-sub">
            {periodLabel} · {totals.length} {totals.length === 1 ? 'category' : 'categories'} with activity
          </p>
        </div>
        <button type="button" className="admin-btn admin-btn-outline admin-btn-sm" onClick={onManageCategories}>
          Manage categories
        </button>
      </div>

      {totals.length === 0 ? (
        <p className="admin-empty">No expenses in this period yet.</p>
      ) : (
        <div className="admin-expenses-category-body">
          <div className="admin-expenses-category-donut">
            <svg width="180" height="180" viewBox="0 0 180 180" aria-hidden="true">
              <circle cx="90" cy="90" r={RADIUS} fill="none" stroke="var(--admin-border, #e5e7eb)" strokeWidth={STROKE} />
              {segments.map((seg) => (
                <circle
                  key={seg.value}
                  cx="90"
                  cy="90"
                  r={RADIUS}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth={STROKE}
                  strokeDasharray={seg.strokeDasharray}
                  strokeDashoffset={seg.strokeDashoffset}
                  transform="rotate(-90 90 90)"
                />
              ))}
            </svg>
            <div className="admin-expenses-category-donut-label">
              <span className="admin-expenses-category-donut-total-label">Total</span>
              <span className="admin-expenses-category-donut-total-value">{formatAmount(grandTotal)}</span>
            </div>
          </div>

          <div className="admin-expenses-category-legend">
            {totals.map((t) => (
              <div key={t.value} className="admin-expenses-category-legend-row">
                <span className="admin-expenses-category-dot" style={{ background: t.color }} />
                <span className="admin-expenses-category-legend-name">{t.label}</span>
                <span className="admin-expenses-category-legend-count">
                  {t.count} {t.count === 1 ? 'item' : 'items'}
                </span>
                <span className="admin-expenses-category-legend-amount">{formatAmount(t.total)}</span>
                <span className="admin-expenses-category-legend-pct">{Math.round(t.percent * 100)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
