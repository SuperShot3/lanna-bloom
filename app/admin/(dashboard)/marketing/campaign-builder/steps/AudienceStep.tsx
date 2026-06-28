'use client';

import styles from '../../CampaignBuilderTab.module.css';
import { StepShell } from '../StepShell';

export interface AudienceStepData {
  languageCode: 'en' | 'th';
  landingUrl: string;
  occasion?: string;
  productFocus?: string;
}

interface AudienceStepProps {
  value: AudienceStepData;
  territoryName: string;
  defaultLandingUrl: string;
  audienceNotes: string;
  isExpansion: boolean;
  onChange: (value: AudienceStepData) => void;
  onApprove: () => void;
  onBack: () => void;
  loading?: boolean;
  issues?: Array<{ level: string; message: string }>;
}

const OCCASIONS = ['birthday', 'anniversary', 'romantic', 'sympathy', 'apology', 'general'];

export function AudienceStep({
  value,
  territoryName,
  defaultLandingUrl,
  audienceNotes,
  isExpansion,
  onChange,
  onApprove,
  onBack,
  loading,
  issues,
}: AudienceStepProps) {
  return (
    <StepShell
      title="Audience & landing URL"
      hint={`English-first ads for foreigners in ${territoryName}: tourists, expats, hotel/villa guests, and English-speaking residents.`}
      badge={isExpansion ? 'New market — territory playbook' : 'Home market'}
      onApprove={onApprove}
      onBack={onBack}
      approveDisabled={!value.landingUrl?.trim()}
      loading={loading}
      issues={issues}
    >
      <p className={styles.hint}>{audienceNotes}</p>

      <label className={styles.questionLabel}>
        Landing URL <span className={styles.required}>*</span>
      </label>
      <input
        className={styles.input}
        type="url"
        value={value.landingUrl}
        onChange={(e) => onChange({ ...value, landingUrl: e.target.value })}
        disabled={loading}
      />
      {value.landingUrl !== defaultLandingUrl && (
        <p className={styles.hint}>
          Default for this market: <code>{defaultLandingUrl}</code>
        </p>
      )}

      <label className={styles.questionLabel} style={{ marginTop: 16 }}>
        Occasion focus <span className={styles.required}>(optional)</span>
      </label>
      <div className={styles.chipGrid}>
        {OCCASIONS.map((occ) => (
          <button
            key={occ}
            type="button"
            className={`${styles.chip} ${value.occasion === occ ? styles.chipSelected : ''}`}
            onClick={() => onChange({ ...value, occasion: occ === 'general' ? undefined : occ })}
            disabled={loading}
          >
            {occ}
          </button>
        ))}
      </div>
    </StepShell>
  );
}
