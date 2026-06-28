'use client';

import type { CampaignValidationResult } from '@/lib/marketing/campaignBuilder/types';
import styles from '../../CampaignBuilderTab.module.css';
import { StepShell } from '../StepShell';

export interface AdCopyGroup {
  name: string;
  headlines: string[];
  descriptions: string[];
}

interface AdCopyReviewCreateStepProps {
  adGroups: AdCopyGroup[];
  dailyBudgetThb: number;
  campaignName?: string;
  territoryName: string;
  locationTargetType: string;
  landingUrl: string;
  onChange: (groups: AdCopyGroup[]) => void;
  onBudgetChange: (budget: number) => void;
  onGenerate: () => void;
  onApprove: () => void;
  onValidate: () => void;
  onCreateDryRun: () => void;
  onCreate: () => void;
  onBack: () => void;
  loading?: boolean;
  generating?: boolean;
  aiAvailable: boolean;
  source?: string;
  validation: CampaignValidationResult | null;
  createResult?: { resourceNames?: string[]; error?: string };
  isOwner: boolean;
  issues?: Array<{ level: string; message: string }>;
}

export function AdCopyReviewCreateStep({
  adGroups,
  dailyBudgetThb,
  campaignName,
  territoryName,
  locationTargetType,
  landingUrl,
  onChange,
  onBudgetChange,
  onGenerate,
  onApprove,
  onValidate,
  onCreateDryRun,
  onCreate,
  onBack,
  loading,
  generating,
  aiAvailable,
  source,
  validation,
  createResult,
  isOwner,
  issues,
}: AdCopyReviewCreateStepProps) {
  function updateHeadline(gi: number, hi: number, text: string) {
    const next = adGroups.map((g, i) =>
      i === gi
        ? { ...g, headlines: g.headlines.map((h, j) => (j === hi ? text : h)) }
        : g,
    );
    onChange(next);
  }

  function updateDescription(gi: number, di: number, text: string) {
    const next = adGroups.map((g, i) =>
      i === gi
        ? { ...g, descriptions: g.descriptions.map((d, j) => (j === di ? text : d)) }
        : g,
    );
    onChange(next);
  }

  return (
    <StepShell
      title="Ad copy & review"
      hint="RSA headlines (max 30 chars) and descriptions (max 90 chars). Campaign creates paused in Google Ads."
      badge={source ? `Source: ${source}` : undefined}
      onApprove={onApprove}
      onBack={onBack}
      approveLabel="Approve copy & budget"
      approveDisabled={adGroups.length === 0 || !dailyBudgetThb}
      loading={loading}
      issues={issues}
      showApprove={!validation?.ok}
    >
      <div className={styles.actions} style={{ marginTop: 0, marginBottom: 16 }}>
        <button
          type="button"
          className="admin-btn admin-btn-outline"
          onClick={onGenerate}
          disabled={generating || loading}
        >
          {generating ? 'Generating…' : aiAvailable ? 'Regenerate ad copy' : 'Load rule-based copy'}
        </button>
        {!aiAvailable && (
          <span className={styles.hint} style={{ alignSelf: 'center' }}>
            AI unavailable — manual entry or rule-based copy
          </span>
        )}
      </div>

      {adGroups.map((g, gi) => (
        <div key={g.name} className={styles.adGroupCard}>
          <h4 className={styles.subheading} style={{ marginTop: 0 }}>
            {g.name}
          </h4>
          <p className={styles.hint}>Headlines</p>
          {g.headlines.map((h, hi) => (
            <div key={hi} style={{ marginBottom: 8 }}>
              <input
                className={styles.input}
                value={h}
                onChange={(e) => updateHeadline(gi, hi, e.target.value)}
                disabled={loading}
                maxLength={35}
              />
              <span className={styles.hint} style={{ fontSize: '0.75rem' }}>
                {h.length}/30
              </span>
            </div>
          ))}
          <p className={styles.hint}>Descriptions</p>
          {g.descriptions.map((d, di) => (
            <div key={di} style={{ marginBottom: 8 }}>
              <textarea
                className={styles.textarea}
                rows={2}
                value={d}
                onChange={(e) => updateDescription(gi, di, e.target.value)}
                disabled={loading}
                maxLength={95}
              />
              <span className={styles.hint} style={{ fontSize: '0.75rem' }}>
                {d.length}/90
              </span>
            </div>
          ))}
        </div>
      ))}

      <label className={styles.questionLabel} style={{ marginTop: 16 }}>
        Daily budget (THB) <span className={styles.required}>*</span>
      </label>
      <input
        className={styles.input}
        type="number"
        min={1}
        max={5000}
        value={dailyBudgetThb || ''}
        onChange={(e) => onBudgetChange(Number(e.target.value))}
        disabled={loading}
      />

      <div className={styles.card} style={{ marginTop: 20, background: '#f8fafc' }}>
        <h4 className={styles.subheading} style={{ marginTop: 0 }}>
          Review summary
        </h4>
        <dl style={{ margin: 0, fontSize: '0.875rem', lineHeight: 1.6 }}>
          <div>
            <dt style={{ fontWeight: 600 }}>Territory</dt>
            <dd style={{ margin: '0 0 8px' }}>{territoryName}</dd>
          </div>
          <div>
            <dt style={{ fontWeight: 600 }}>Targeting</dt>
            <dd style={{ margin: '0 0 8px' }}>
              {locationTargetType === 'PRESENCE' ? 'People in location' : 'In or interested in'}
            </dd>
          </div>
          <div>
            <dt style={{ fontWeight: 600 }}>Landing URL</dt>
            <dd style={{ margin: '0 0 8px', wordBreak: 'break-all' }}>{landingUrl}</dd>
          </div>
          {campaignName && (
            <div>
              <dt style={{ fontWeight: 600 }}>Campaign name</dt>
              <dd style={{ margin: '0 0 8px' }}>{campaignName}</dd>
            </div>
          )}
        </dl>
      </div>

      {validation && (
        <div
          className={`${styles.alert} ${validation.ok ? styles.alertOk : styles.alertError}`}
          style={{ marginTop: 16 }}
        >
          <div className={styles.alertTitle}>
            {validation.ok ? 'Validation passed' : 'Validation failed'}
          </div>
          {validation.issues.length > 0 && (
            <ul className={styles.issueList}>
              {validation.issues.map((issue, i) => (
                <li key={i} className={issue.level === 'error' ? styles.issueError : styles.issueWarning}>
                  {issue.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {createResult?.resourceNames && (
        <div className={`${styles.alert} ${styles.alertInfo}`} style={{ marginTop: 16 }}>
          <div className={styles.alertTitle}>Create result</div>
          <ul className={styles.issueList}>
            {createResult.resourceNames.slice(0, 8).map((r, i) => (
              <li key={i}>{r}</li>
            ))}
            {createResult.resourceNames.length > 8 && <li>…and {createResult.resourceNames.length - 8} more</li>}
          </ul>
        </div>
      )}

      {createResult?.error && (
        <div className={styles.errorBanner} style={{ marginTop: 16 }}>
          {createResult.error}
        </div>
      )}

      {isOwner && validation?.ok && (
        <div className={styles.btnStack} style={{ marginTop: 16 }}>
          <button type="button" className="admin-btn admin-btn-outline" onClick={onCreateDryRun} disabled={loading}>
            Dry run
          </button>
          <button type="button" className="admin-btn admin-btn-primary" onClick={onCreate} disabled={loading}>
            Create paused campaign
          </button>
        </div>
      )}

      {isOwner && !validation && (
        <div style={{ marginTop: 16 }}>
          <button type="button" className="admin-btn admin-btn-outline" onClick={onValidate} disabled={loading}>
            Validate campaign
          </button>
        </div>
      )}
    </StepShell>
  );
}
