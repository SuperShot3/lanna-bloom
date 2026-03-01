export default function AdminOrdersLoading() {
  return (
    <div className="admin-v2-orders">
      <header className="admin-v2-header">
        <div>
          <div className="admin-orders-skeleton-title" aria-hidden />
          <div className="admin-orders-skeleton-hint" aria-hidden />
        </div>
        <div className="admin-v2-header-actions">
          <div className="admin-orders-skeleton-btn" aria-hidden />
          <div className="admin-orders-skeleton-btn" aria-hidden />
        </div>
      </header>

      <div className="admin-v2-filters">
        <div className="admin-v2-filters-row">
          <div className="admin-orders-skeleton-input" aria-hidden />
          <div className="admin-orders-skeleton-input" aria-hidden />
          <div className="admin-orders-skeleton-btn" aria-hidden />
        </div>
      </div>

      <div className="admin-v2-table-wrap">
        <table className="admin-v2-table">
          <thead>
            <tr>
              <th>Created</th>
              <th>Order ID</th>
              <th>Status</th>
              <th>Payment</th>
              <th>Total</th>
              <th>Discount</th>
              <th>Delivery date</th>
              <th>Window</th>
              <th>District</th>
              <th>Recipient</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 12 }).map((_, i) => (
              <tr key={i}>
                {Array.from({ length: 10 }).map((_, j) => (
                  <td key={j}>
                    <div className="admin-orders-skeleton-cell" aria-hidden />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="admin-v2-pagination">
        <div className="admin-orders-skeleton-pagination" aria-hidden />
      </div>

      <style jsx>{`
        .admin-orders-skeleton-title {
          height: 24px;
          width: 120px;
          background: var(--pastel-cream);
          border-radius: 4px;
          animation: skeleton-pulse 1.5s ease-in-out infinite;
        }
        .admin-orders-skeleton-hint {
          height: 14px;
          width: 80px;
          margin-top: 6px;
          background: var(--pastel-cream);
          border-radius: 4px;
          animation: skeleton-pulse 1.5s ease-in-out infinite;
        }
        .admin-orders-skeleton-input {
          height: 38px;
          min-width: 140px;
          flex: 1;
          background: var(--pastel-cream);
          border-radius: var(--radius-sm);
          animation: skeleton-pulse 1.5s ease-in-out infinite;
        }
        .admin-orders-skeleton-btn {
          height: 38px;
          width: 80px;
          background: var(--pastel-cream);
          border-radius: var(--radius-sm);
          animation: skeleton-pulse 1.5s ease-in-out infinite;
        }
        .admin-orders-skeleton-cell {
          height: 16px;
          width: 80%;
          max-width: 100px;
          background: var(--pastel-cream);
          border-radius: 4px;
          animation: skeleton-pulse 1.5s ease-in-out infinite;
        }
        .admin-orders-skeleton-pagination {
          height: 24px;
          width: 200px;
          background: var(--pastel-cream);
          border-radius: 4px;
          animation: skeleton-pulse 1.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
