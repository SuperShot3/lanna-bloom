'use client';

import styles from './loading.module.css';

export default function AdminOrdersLoading() {
  return (
    <div className="admin-v2-orders">
      <header className="admin-v2-header">
        <div>
          <div className={styles.skeletonTitle} aria-hidden />
          <div className={styles.skeletonHint} aria-hidden />
        </div>
        <div className="admin-v2-header-actions">
          <div className={styles.skeletonBtn} aria-hidden />
          <div className={styles.skeletonBtn} aria-hidden />
        </div>
      </header>

      <div className="admin-v2-filters">
        <div className="admin-v2-filters-row">
          <div className={styles.skeletonInput} aria-hidden />
          <div className={styles.skeletonInput} aria-hidden />
          <div className={styles.skeletonBtn} aria-hidden />
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
                    <div className={styles.skeletonCell} aria-hidden />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="admin-v2-pagination">
        <div className={styles.skeletonPagination} aria-hidden />
      </div>
    </div>
  );
}
