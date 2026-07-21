import {
  adminPromoCatalogAsOf,
  adminPromoStatusLabel,
  listPromoCodesForAdmin,
  type AdminPromoStatus,
} from '@/lib/promo/listPromoCodesForAdmin';

function statusClass(status: AdminPromoStatus): string {
  switch (status) {
    case 'active':
      return 'admin-promo-status--active';
    case 'scheduled':
      return 'admin-promo-status--scheduled';
    case 'inactive':
      return 'admin-promo-status--inactive';
    case 'expired':
      return 'admin-promo-status--expired';
  }
}

export function CouponsStatusSection() {
  const rows = listPromoCodesForAdmin();
  const asOf = adminPromoCatalogAsOf();

  return (
    <section className="admin-section">
      <h2 className="admin-section-title">Coupons &amp; promo codes</h2>
      <p className="admin-muted" style={{ margin: '6px 0 12px' }}>
        Read-only view of allowlisted codes (as of {asOf}, Asia/Bangkok). To change expiry or
        disable a code, update config in code and deploy. Newsletter{' '}
        <code>WELCOME10-*</code> codes are per-subscriber and not listed here.
      </p>
      {rows.length === 0 ? (
        <p className="admin-empty">No promo codes configured.</p>
      ) : (
        <div className="admin-promo-table-wrap">
          <table className="admin-promo-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Type</th>
                <th>Rules</th>
                <th>Status</th>
                <th>Expires</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.code}>
                  <td>
                    <code>{row.code}</code>
                  </td>
                  <td>{row.typeLabel}</td>
                  <td>
                    <div>{row.summary}</div>
                    {row.notes ? (
                      <div className="admin-muted" style={{ fontSize: '0.85rem', marginTop: 4 }}>
                        {row.notes}
                      </div>
                    ) : null}
                  </td>
                  <td>
                    <span className={`admin-promo-status ${statusClass(row.status)}`}>
                      {adminPromoStatusLabel(row.status)}
                    </span>
                  </td>
                  <td>{row.expiresLabel}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <style>{`
        .admin-promo-table-wrap {
          overflow-x: auto;
        }
        .admin-promo-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.9rem;
        }
        .admin-promo-table th,
        .admin-promo-table td {
          text-align: left;
          padding: 10px 12px;
          border-bottom: 1px solid var(--border, #e5e0d8);
          vertical-align: top;
        }
        .admin-promo-table th {
          font-weight: 600;
          color: var(--text-muted, #666);
          white-space: nowrap;
        }
        .admin-promo-status {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 0.8rem;
          font-weight: 600;
        }
        .admin-promo-status--active {
          background: #e8f5e9;
          color: #1b5e20;
        }
        .admin-promo-status--scheduled {
          background: #e3f2fd;
          color: #0d47a1;
        }
        .admin-promo-status--inactive {
          background: #f5f5f5;
          color: #616161;
        }
        .admin-promo-status--expired {
          background: #ffebee;
          color: #b71c1c;
        }
      `}</style>
    </section>
  );
}
