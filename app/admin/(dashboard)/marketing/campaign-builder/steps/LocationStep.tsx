'use client';

import type { DeliveryDestinationId } from '@/lib/delivery/markets';
import type { LocationTargetType } from '@/lib/marketing/campaignBuilder/types';
import styles from '../../CampaignBuilderTab.module.css';
import { StepShell } from '../StepShell';

export interface TerritoryOption {
  destinationId: DeliveryDestinationId;
  territoryName: string;
  marketSlug: string | null;
  marketType: string;
  landingUrl: string;
  audienceNotes: string;
  sameDayAllowed: boolean;
}

export interface LocationStepData {
  destinationId: DeliveryDestinationId;
  territoryName: string;
  marketSlug: string | null;
  locationTargetType: LocationTargetType;
  campaignGoal?: string;
}

interface LocationStepProps {
  territories: TerritoryOption[];
  value: LocationStepData | null;
  campaignGoal: string;
  onChange: (value: LocationStepData) => void;
  onGoalChange: (goal: string) => void;
  onApprove: () => void;
  loading?: boolean;
  issues?: Array<{ level: string; message: string }>;
}

export function LocationStep({
  territories,
  value,
  campaignGoal,
  onChange,
  onGoalChange,
  onApprove,
  loading,
  issues,
}: LocationStepProps) {
  return (
    <StepShell
      title="Choose location"
      hint="Select a supported Thailand market. Location is never inferred from free text."
      onApprove={onApprove}
      approveDisabled={!value?.destinationId || !value?.locationTargetType}
      loading={loading}
      issues={issues}
    >
      <label className={styles.questionLabel}>
        Campaign goal <span className={styles.required}>(optional)</span>
      </label>
      <textarea
        className={styles.textarea}
        rows={3}
        value={campaignGoal}
        onChange={(e) => onGoalChange(e.target.value)}
        placeholder="e.g. Birthday flower delivery for tourists in Phuket"
        disabled={loading}
      />

      <label className={styles.questionLabel} style={{ marginTop: 16 }}>
        Target market <span className={styles.required}>*</span>
      </label>
      <div className={styles.chipGrid} role="listbox" aria-label="Target market">
        {territories.map((t) => (
          <button
            key={t.destinationId}
            type="button"
            role="option"
            aria-selected={value?.destinationId === t.destinationId}
            className={`${styles.chip} ${value?.destinationId === t.destinationId ? styles.chipSelected : ''}`}
            onClick={() =>
              onChange({
                destinationId: t.destinationId,
                territoryName: t.territoryName,
                marketSlug: t.marketSlug,
                locationTargetType: value?.locationTargetType ?? 'PRESENCE',
                campaignGoal,
              })
            }
            disabled={loading}
          >
            {t.territoryName}
          </button>
        ))}
      </div>

      <label className={styles.questionLabel} style={{ marginTop: 16 }}>
        Who should see ads? <span className={styles.required}>*</span>
      </label>
      <div className={styles.chipGroup}>
        <button
          type="button"
          className={`${styles.chip} ${value?.locationTargetType === 'PRESENCE' ? styles.chipSelected : ''}`}
          onClick={() =>
            value &&
            onChange({ ...value, locationTargetType: 'PRESENCE' })
          }
          disabled={!value || loading}
        >
          People in this location
        </button>
        <button
          type="button"
          className={`${styles.chip} ${value?.locationTargetType === 'PRESENCE_OR_INTEREST' ? styles.chipSelected : ''}`}
          onClick={() =>
            value &&
            onChange({ ...value, locationTargetType: 'PRESENCE_OR_INTEREST' })
          }
          disabled={!value || loading}
        >
          People in or interested in
        </button>
      </div>
    </StepShell>
  );
}
