'use client';

import type { DiagnosticsReport, FunnelStep, TrackingHealthCheck } from '@/lib/marketing/types';
import styles from './MarketingDiagnostics.module.css';

function fmtThb(n: number) {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    maximumFractionDigits: 0,
  }).format(n);
}

function HealthBadge({ status }: { status: TrackingHealthCheck['status'] }) {
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

function verdictClass(severity: DiagnosticsReport['verdict']['severity']) {
  if (severity === 'error') return styles.verdictError;
  if (severity === 'warn') return styles.verdictWarn;
  return styles.verdictOk;
}

export function DiagnosticsPanel({
  diagnostics,
  onNavigate,
}: {
  diagnostics: DiagnosticsReport;
  onNavigate: (tab: 'funnel' | 'ads') => void;
}) {
  const { metrics, verdict, checks } = diagnostics;

  return (
    <>
      <section className={styles.realityGrid}>
        <div className={styles.realityCard}>
          <p className={styles.realityLabel}>Paid orders (Supabase)</p>
          <p className={styles.realityValue}>{metrics.paidOrderCount}</p>
          <p className={styles.realitySub}>{fmtThb(metrics.paidOrderRevenue)} revenue</p>
        </div>
        <div className={styles.realityCard}>
          <p className={styles.realityLabel}>GA4 purchases</p>
          <p className={styles.realityValue}>{metrics.ga4Purchases}</p>
          <p className={styles.realitySub}>Browser purchase events</p>
        </div>
        <div className={styles.realityCard}>
          <p className={styles.realityLabel}>Google Ads conversions</p>
          <p className={styles.realityValue}>
            {metrics.adsConversions != null ? metrics.adsConversions : '—'}
          </p>
          <p className={styles.realitySub}>
            {metrics.adsConversions == null ? 'Ads not configured' : 'From Ads API'}
          </p>
        </div>
        <div className={styles.realityCard}>
          <p className={styles.realityLabel}>Ad spend + clicks</p>
          <p className={styles.realityValue}>
            {metrics.adsSpend != null ? fmtThb(metrics.adsSpend) : '—'}
          </p>
          <p className={styles.realitySub}>
            {metrics.adsClicks != null ? `${metrics.adsClicks} clicks` : 'Ads not configured'}
          </p>
        </div>
      </section>

      <section className={`${styles.verdictBanner} ${verdictClass(verdict.severity)}`}>
        <h3 className={styles.verdictTitle}>{verdict.title}</h3>
        <p className={styles.verdictMessage}>{verdict.message}</p>
        {verdict.nextSteps.length > 0 && (
          <>
            <strong style={{ fontSize: '0.875rem' }}>What to check next</strong>
            <ul className={styles.nextSteps}>
              {verdict.nextSteps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ul>
          </>
        )}
        <div className={styles.quickLinks}>
          <button type="button" className={styles.quickLink} onClick={() => onNavigate('funnel')}>
            See funnel drop-off
          </button>
          <button type="button" className={styles.quickLink} onClick={() => onNavigate('ads')}>
            See wasted search terms
          </button>
        </div>
      </section>

      <section className="admin-card">
        <h3 className="admin-section-title">Tracking health</h3>
        <ul className={styles.healthList}>
          {checks.map((c) => (
            <li key={c.code} className={styles.healthItem}>
              <HealthBadge status={c.status} />
              <div>
                <strong>{c.title}</strong>
                <p className="admin-hint" style={{ margin: '4px 0 0' }}>
                  {c.detail}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

export function FunnelBar({ steps }: { steps: FunnelStep[] }) {
  const maxCount = Math.max(...steps.map((s) => s.count), 1);

  return (
    <div className={styles.funnelBar}>
      {steps.map((step) => (
        <div
          key={step.event}
          className={styles.funnelStep}
          style={{ opacity: 0.4 + (step.count / maxCount) * 0.6 }}
        >
          <p className={styles.funnelStepLabel}>{step.label}</p>
          <p className={styles.funnelStepCount}>{step.count}</p>
          {step.rateFromPrevious != null && (
            <p className={styles.funnelStepRate}>
              {Math.round(step.rateFromPrevious * 100)}% from prev
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
