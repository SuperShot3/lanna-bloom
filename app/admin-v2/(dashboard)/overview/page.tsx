import Link from 'next/link';
import { getTodayStats, getNeedsAttention } from '@/lib/supabase/opsQueries';

function formatThb(n: number): string {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

export default async function AdminV2OverviewPage() {
  const [stats, attention] = await Promise.all([getTodayStats(), getNeedsAttention()]);

  const totalAttention =
    attention.paidNotAccepted.length +
    attention.preparingStale.length +
    attention.outForDeliveryStale.length +
    attention.missingCriticalFields.length +
    attention.paidMissingCosts.length;

  return (
    <div className="admin-v2-overview">
      <header className="admin-v2-header">
        <div>
          <h1 className="admin-v2-title">Overview</h1>
          <p className="admin-v2-hint">Admin Dashboard v2 — Today&apos;s stats</p>
        </div>
        <div className="admin-v2-header-actions">
          <Link href="/admin-v2/orders" className="admin-v2-btn">
            Orders
          </Link>
          <Link href="/admin/orders" className="admin-v2-link">
            Legacy admin
          </Link>
          <a href="/api/auth/signout?callbackUrl=/admin-v2/login" className="admin-v2-btn admin-v2-btn-outline">
            Log out
          </a>
        </div>
      </header>

      <section className="admin-v2-section">
        <h2 className="admin-v2-section-title">Today</h2>
        <div className="admin-v2-stats-grid">
          <div className="admin-v2-stat-card">
            <span className="admin-v2-stat-label">Total orders</span>
            <span className="admin-v2-stat-value">{stats.totalOrders}</span>
          </div>
          <div className="admin-v2-stat-card">
            <span className="admin-v2-stat-label">Paid orders</span>
            <span className="admin-v2-stat-value">{stats.paidOrders}</span>
          </div>
          <div className="admin-v2-stat-card">
            <span className="admin-v2-stat-label">Revenue</span>
            <span className="admin-v2-stat-value">{formatThb(stats.revenue)}</span>
          </div>
          <div className="admin-v2-stat-card">
            <span className="admin-v2-stat-label">Profit</span>
            <span className="admin-v2-stat-value">{formatThb(stats.profit)}</span>
          </div>
          <div className="admin-v2-stat-card">
            <span className="admin-v2-stat-label">Profit coverage</span>
            <span className="admin-v2-stat-value">{stats.profitCoverage.toFixed(1)}%</span>
          </div>
        </div>
      </section>

      <section className="admin-v2-section">
        <h2 className="admin-v2-section-title">
          Needs attention
          {totalAttention > 0 && (
            <span className="admin-v2-attention-badge">{totalAttention}</span>
          )}
        </h2>

        {totalAttention === 0 ? (
          <p className="admin-v2-hint">No orders need attention.</p>
        ) : (
          <div className="admin-v2-attention-lists">
            {attention.paidNotAccepted.length > 0 && (
              <div className="admin-v2-attention-group">
                <h3>PAID not ACCEPTED (10+ min)</h3>
                <ul>
                  {attention.paidNotAccepted.map((o) => (
                    <li key={o.order_id}>
                      <Link href={`/admin-v2/orders/${encodeURIComponent(o.order_id)}?returnTo=${encodeURIComponent('/admin-v2/overview')}`} className="admin-v2-link">
                        {o.order_id}
                      </Link>
                      <span className="admin-v2-attention-reason">{o.reason}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {attention.preparingStale.length > 0 && (
              <div className="admin-v2-attention-group">
                <h3>PREPARING &gt; 90 min</h3>
                <ul>
                  {attention.preparingStale.map((o) => (
                    <li key={o.order_id}>
                      <Link href={`/admin-v2/orders/${encodeURIComponent(o.order_id)}?returnTo=${encodeURIComponent('/admin-v2/overview')}`} className="admin-v2-link">
                        {o.order_id}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {attention.outForDeliveryStale.length > 0 && (
              <div className="admin-v2-attention-group">
                <h3>OUT_FOR_DELIVERY &gt; 120 min</h3>
                <ul>
                  {attention.outForDeliveryStale.map((o) => (
                    <li key={o.order_id}>
                      <Link href={`/admin-v2/orders/${encodeURIComponent(o.order_id)}?returnTo=${encodeURIComponent('/admin-v2/overview')}`} className="admin-v2-link">
                        {o.order_id}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {attention.missingCriticalFields.length > 0 && (
              <div className="admin-v2-attention-group">
                <h3>Missing critical fields</h3>
                <ul>
                  {attention.missingCriticalFields.map((o) => (
                    <li key={o.order_id}>
                      <Link href={`/admin-v2/orders/${encodeURIComponent(o.order_id)}?returnTo=${encodeURIComponent('/admin-v2/overview')}`} className="admin-v2-link">
                        {o.order_id}
                      </Link>
                      <span className="admin-v2-attention-reason">{o.reason}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {attention.paidMissingCosts.length > 0 && (
              <div className="admin-v2-attention-group">
                <h3>Paid orders missing costs</h3>
                <ul>
                  {attention.paidMissingCosts.map((o) => (
                    <li key={o.order_id}>
                      <Link href={`/admin-v2/orders/${encodeURIComponent(o.order_id)}?returnTo=${encodeURIComponent('/admin-v2/overview')}`} className="admin-v2-link">
                        {o.order_id}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
