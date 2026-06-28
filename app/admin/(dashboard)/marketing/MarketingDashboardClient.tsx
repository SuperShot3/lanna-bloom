'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import type {
  AdsOverview,
  FunnelReport,
  MarketingConfigStatus,
  MarketingRecommendation,
  TrackingHealthReport,
} from '@/lib/marketing/types';
import { CampaignBuilderTab } from './CampaignBuilderTab';

type Tab = 'ads' | 'funnel' | 'recommendations' | 'campaign-builder';

function fmtThb(n: number) {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    maximumFractionDigits: 0,
  }).format(n);
}

function fmtPct(n: number | null) {
  if (n == null) return '—';
  return `${(n * 100).toFixed(1)}%`;
}

function StatusBadge({ ok }: { ok: boolean }) {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: 999,
        fontSize: 12,
        background: ok ? '#dcfce7' : '#fef3c7',
        color: ok ? '#166534' : '#92400e',
      }}
    >
      {ok ? 'Configured' : 'Not set'}
    </span>
  );
}

function HealthBadge({ status }: { status: 'ok' | 'warn' | 'error' }) {
  const colors = {
    ok: { bg: '#dcfce7', fg: '#166534' },
    warn: { bg: '#fef3c7', fg: '#92400e' },
    error: { bg: '#fee2e2', fg: '#991b1b' },
  };
  const c = colors[status];
  return (
    <span style={{ padding: '2px 8px', borderRadius: 999, fontSize: 12, background: c.bg, color: c.fg }}>
      {status}
    </span>
  );
}

function MetricTable({
  title,
  rows,
  nameLabel,
}: {
  title: string;
  rows: { id: string; name: string; spend: number; clicks: number; conversions: number; roas: number | null; cpa: number | null }[];
  nameLabel: string;
}) {
  if (rows.length === 0) return null;
  return (
    <section className="admin-card" style={{ marginTop: 16 }}>
      <h3 className="admin-section-title">{title}</h3>
      <div style={{ overflowX: 'auto' }}>
        <table className="admin-table" style={{ width: '100%', fontSize: 14 }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left' }}>{nameLabel}</th>
              <th>Spend</th>
              <th>Clicks</th>
              <th>Conv.</th>
              <th>CPA</th>
              <th>ROAS</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 15).map((row) => (
              <tr key={row.id}>
                <td style={{ maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.name}</td>
                <td>{fmtThb(row.spend)}</td>
                <td>{row.clicks}</td>
                <td>{row.conversions}</td>
                <td>{row.cpa != null ? fmtThb(row.cpa) : '—'}</td>
                <td>{row.roas != null ? `${row.roas.toFixed(1)}x` : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function MarketingDashboardClient() {
  const { data: session } = useSession();
  const isOwner = (session?.user as { role?: string } | undefined)?.role === 'OWNER';
  const [tab, setTab] = useState<Tab>('ads');
  const [days, setDays] = useState(14);
  const [config, setConfig] = useState<MarketingConfigStatus | null>(null);
  const [overview, setOverview] = useState<AdsOverview | null>(null);
  const [funnel, setFunnel] = useState<FunnelReport | null>(null);
  const [health, setHealth] = useState<TrackingHealthReport | null>(null);
  const [recommendations, setRecommendations] = useState<MarketingRecommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);

  const loadConfig = useCallback(async () => {
    const res = await fetch('/api/admin/marketing/status');
    if (res.ok) {
      const data = await res.json();
      setConfig(data.config);
    }
  }, []);

  const loadRecommendations = useCallback(async () => {
    const res = await fetch('/api/admin/marketing/recommendations');
    if (res.ok) {
      const data = await res.json();
      setRecommendations(data.recommendations ?? []);
    }
  }, []);

  const loadAds = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/marketing/ads/overview?days=${days}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to load ads');
      setOverview(data.overview);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load ads');
    } finally {
      setLoading(false);
    }
  }, [days]);

  const loadFunnel = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [funnelRes, healthRes] = await Promise.all([
        fetch(`/api/admin/marketing/funnel?days=${days}`),
        fetch(`/api/admin/marketing/tracking-health?days=${days}`),
      ]);
      const funnelData = await funnelRes.json();
      const healthData = await healthRes.json();
      if (!funnelRes.ok) throw new Error(funnelData.error ?? 'Failed to load funnel');
      setFunnel(funnelData.funnel);
      if (healthRes.ok) setHealth(healthData.health);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load funnel');
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    loadConfig();
    loadRecommendations();
  }, [loadConfig, loadRecommendations]);

  useEffect(() => {
    if (tab === 'ads' && config?.googleAds) loadAds();
    if (tab === 'funnel' && config?.ga4) loadFunnel();
  }, [tab, days, config, loadAds, loadFunnel]);

  async function generateRecommendations() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/marketing/recommendations/generate?days=${days}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ includeLlm: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Generation failed');
      await loadRecommendations();
      setTab('recommendations');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generation failed');
    } finally {
      setLoading(false);
    }
  }

  async function recAction(id: string, action: 'approve' | 'reject' | 'apply') {
    if (!isOwner) return;
    setActionId(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/marketing/recommendations/${id}/${action}`, {
        method: 'POST',
        headers: action === 'apply' ? { 'Content-Type': 'application/json' } : undefined,
        body: action === 'apply' ? JSON.stringify({ dryRun: false }) : undefined,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `${action} failed`);
      await loadRecommendations();
    } catch (e) {
      setError(e instanceof Error ? e.message : `${action} failed`);
    } finally {
      setActionId(null);
    }
  }

  return (
    <div className="admin-page">
      <header className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Marketing Insights</h1>
          <p className="admin-hint">
            Monitor Google Ads, checkout funnel drop-off, and AI recommendations. Changes require owner approval.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <label className="admin-hint">
            Period
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              style={{ marginLeft: 8 }}
            >
              <option value={7}>7 days</option>
              <option value={14}>14 days</option>
              <option value={30}>30 days</option>
            </select>
          </label>
          {config?.googleAds && (
            <button type="button" className="admin-btn admin-btn-primary" onClick={generateRecommendations} disabled={loading}>
              Generate recommendations
            </button>
          )}
        </div>
      </header>

      {config && (
        <div className="admin-stats-grid" style={{ marginBottom: 16 }}>
          <div className="admin-stat-card">
            <div className="admin-stat-label">Google Ads API</div>
            <StatusBadge ok={config.googleAds} />
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-label">GA4 Data API</div>
            <StatusBadge ok={config.ga4} />
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-label">LLM (OpenAI)</div>
            <StatusBadge ok={config.llm} />
          </div>
        </div>
      )}

      <div className="admin-tabs" style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {(['ads', 'funnel', 'recommendations', 'campaign-builder'] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            className={`admin-btn ${tab === t ? 'admin-btn-primary' : ''}`}
            onClick={() => setTab(t)}
          >
            {t === 'ads'
              ? 'Google Ads'
              : t === 'funnel'
                ? 'Funnel & tracking'
                : t === 'recommendations'
                  ? 'Recommendations'
                  : 'Campaign Builder'}
          </button>
        ))}
      </div>

      {error && (
        <div className="admin-error" style={{ marginBottom: 16 }}>
          <p>{error}</p>
        </div>
      )}

      {loading && <p className="admin-hint">Loading…</p>}

      {tab === 'ads' && (
        <>
          {!config?.googleAds && (
            <div className="admin-card">
              <p>Configure Google Ads env vars to load campaign data. See <code>.env.example</code>.</p>
            </div>
          )}
          {overview && (
            <>
              <div className="admin-stats-grid">
                <div className="admin-stat-card">
                  <div className="admin-stat-label">Spend</div>
                  <div className="admin-stat-value">{fmtThb(overview.summary.spend)}</div>
                </div>
                <div className="admin-stat-card">
                  <div className="admin-stat-label">Clicks</div>
                  <div className="admin-stat-value">{overview.summary.clicks}</div>
                </div>
                <div className="admin-stat-card">
                  <div className="admin-stat-label">CTR</div>
                  <div className="admin-stat-value">{fmtPct(overview.summary.ctr)}</div>
                </div>
                <div className="admin-stat-card">
                  <div className="admin-stat-label">Conversions</div>
                  <div className="admin-stat-value">{overview.summary.conversions}</div>
                </div>
                <div className="admin-stat-card">
                  <div className="admin-stat-label">CPA</div>
                  <div className="admin-stat-value">
                    {overview.summary.cpa != null ? fmtThb(overview.summary.cpa) : '—'}
                  </div>
                </div>
                <div className="admin-stat-card">
                  <div className="admin-stat-label">ROAS</div>
                  <div className="admin-stat-value">
                    {overview.summary.roas != null ? `${overview.summary.roas.toFixed(1)}x` : '—'}
                  </div>
                </div>
              </div>

              {overview.flags.length > 0 && (
                <section className="admin-card" style={{ marginTop: 16 }}>
                  <h3 className="admin-section-title">Flags</h3>
                  <ul style={{ margin: 0, paddingLeft: 20 }}>
                    {overview.flags.map((f) => (
                      <li key={`${f.code}-${f.entityId ?? f.title}`} style={{ marginBottom: 8 }}>
                        <strong>{f.title}</strong> — {f.detail}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              <MetricTable title="Campaigns" rows={overview.campaigns} nameLabel="Campaign" />
              <MetricTable title="Top keywords" rows={overview.keywords} nameLabel="Keyword" />
              <MetricTable title="Search terms" rows={overview.searchTerms} nameLabel="Search term" />
              <MetricTable title="Landing pages" rows={overview.landingPages} nameLabel="URL" />
            </>
          )}
        </>
      )}

      {tab === 'funnel' && (
        <>
          {!config?.ga4 && (
            <div className="admin-card">
              <p>Configure GA4_PROPERTY_ID and a Google service account to load funnel diagnostics.</p>
            </div>
          )}
          {funnel && (
            <>
              <section className="admin-card">
                <h3 className="admin-section-title">Checkout funnel</h3>
                <div style={{ overflowX: 'auto' }}>
                  <table className="admin-table" style={{ width: '100%', fontSize: 14 }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left' }}>Step</th>
                        <th>Events</th>
                        <th>Drop-off</th>
                        <th>Drop-off %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {funnel.steps.map((step) => (
                        <tr key={step.event}>
                          <td>{step.label}</td>
                          <td>{step.count}</td>
                          <td>{step.dropoffFromPrevious ?? '—'}</td>
                          <td>{fmtPct(step.dropoffRateFromPrevious)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="admin-hint" style={{ marginTop: 12 }}>
                  Paid sessions: {funnel.paidSessions} · Organic: {funnel.organicSessions} · Paid conv. rate:{' '}
                  {fmtPct(funnel.paidPurchaseRate)} · Organic: {fmtPct(funnel.organicPurchaseRate)}
                </p>
              </section>

              {health && (
                <section className="admin-card" style={{ marginTop: 16 }}>
                  <h3 className="admin-section-title">Tracking health</h3>
                  <ul style={{ margin: 0, paddingLeft: 0, listStyle: 'none' }}>
                    {health.checks.map((c) => (
                      <li key={c.code} style={{ marginBottom: 12, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                        <HealthBadge status={c.status} />
                        <div>
                          <strong>{c.title}</strong>
                          <p className="admin-hint" style={{ margin: '4px 0 0' }}>{c.detail}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </>
          )}
        </>
      )}

      {tab === 'recommendations' && (
        <section className="admin-card">
          <h3 className="admin-section-title">Recommendations</h3>
          {!isOwner && (
            <p className="admin-hint">Only owners can approve or apply changes. You can view recommendations.</p>
          )}
          {recommendations.length === 0 ? (
            <p className="admin-hint">No recommendations yet. Generate from the Google Ads tab when configured.</p>
          ) : (
            <ul style={{ margin: 0, paddingLeft: 0, listStyle: 'none' }}>
              {recommendations.map((rec) => (
                <li
                  key={rec.id}
                  style={{
                    borderBottom: '1px solid #eee',
                    padding: '12px 0',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                    <div>
                      <strong>{rec.title}</strong>
                      <span style={{ marginLeft: 8, fontSize: 12, color: '#666' }}>{rec.status}</span>
                      <p style={{ margin: '4px 0' }}>{rec.summary}</p>
                      <p className="admin-hint">{rec.reasoning}</p>
                      <p className="admin-hint">
                        Confidence: {rec.confidence} · Risk: {rec.riskLevel}
                        {rec.canApplyViaApi ? ' · API apply supported' : ' · Manual only'}
                      </p>
                      {rec.applyError && <p style={{ color: '#b91c1c' }}>{rec.applyError}</p>}
                    </div>
                    {isOwner && (rec.status === 'new' || rec.status === 'approved') && (
                      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                        {rec.status === 'new' && rec.canApplyViaApi && (
                          <button
                            type="button"
                            className="admin-btn admin-btn-primary"
                            disabled={actionId === rec.id}
                            onClick={() => recAction(rec.id, 'approve')}
                          >
                            Approve
                          </button>
                        )}
                        {rec.status === 'new' && (
                          <button
                            type="button"
                            className="admin-btn"
                            disabled={actionId === rec.id}
                            onClick={() => recAction(rec.id, 'reject')}
                          >
                            Reject
                          </button>
                        )}
                        {rec.status === 'approved' && rec.canApplyViaApi && (
                          <button
                            type="button"
                            className="admin-btn admin-btn-primary"
                            disabled={actionId === rec.id}
                            onClick={() => recAction(rec.id, 'apply')}
                          >
                            Apply to Google Ads
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {tab === 'campaign-builder' && (
        <CampaignBuilderTab
          isOwner={isOwner}
          googleAdsConfigured={config?.googleAds ?? false}
          llmConfigured={config?.llm ?? false}
        />
      )}
    </div>
  );
}
