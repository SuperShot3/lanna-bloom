'use client';

import type { ReactNode } from 'react';
import styles from '../CampaignBuilderTab.module.css';

interface StepShellProps {
  title: string;
  hint?: string;
  children: ReactNode;
  onApprove?: () => void;
  onBack?: () => void;
  approveLabel?: string;
  approveDisabled?: boolean;
  showApprove?: boolean;
  loading?: boolean;
  issues?: Array<{ level: string; message: string }>;
  badge?: string;
}

export function StepShell({
  title,
  hint,
  children,
  onApprove,
  onBack,
  approveLabel = 'Approve & continue',
  approveDisabled,
  showApprove = true,
  loading,
  issues,
  badge,
}: StepShellProps) {
  return (
    <section className={styles.card}>
      <div className={styles.draftHeader}>
        <div>
          <h3 className={styles.sectionTitle}>{title}</h3>
          {hint && <p className={styles.hint}>{hint}</p>}
          {badge && (
            <span className={styles.metaPill} style={{ marginTop: 8 }}>
              {badge}
            </span>
          )}
        </div>
      </div>

      {issues && issues.length > 0 && (
        <div className={`${styles.alert} ${styles.alertError}`}>
          <div className={styles.alertTitle}>Fix these before approving</div>
          <ul className={styles.issueList}>
            {issues.map((issue, i) => (
              <li key={i} className={styles.issueError}>
                {issue.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {children}

      <div className={styles.actionsRow} style={{ marginTop: 20 }}>
        {onBack && (
          <button type="button" className="admin-btn admin-btn-outline" onClick={onBack} disabled={loading}>
            Back
          </button>
        )}
        {showApprove && onApprove && (
          <button
            type="button"
            className="admin-btn admin-btn-primary"
            onClick={onApprove}
            disabled={approveDisabled || loading}
          >
            {loading ? 'Saving…' : approveLabel}
          </button>
        )}
      </div>
    </section>
  );
}
