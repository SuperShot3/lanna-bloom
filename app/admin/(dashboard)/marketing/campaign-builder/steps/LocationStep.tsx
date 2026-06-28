'use client';

import type { DeliveryDestinationId } from '@/lib/delivery/markets';
import type { LocationTargetType } from '@/lib/marketing/campaignBuilder/types';
import type {
  CustomGuidanceCategory,
  CustomGuidanceLibraryItem,
} from '@/lib/marketing/campaignBuilder/wizard/steps';
import styles from '../../CampaignBuilderTab.module.css';
import { CustomGuidanceField } from '../CustomGuidanceField';
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
  customNotes?: string;
}

interface LocationStepProps {
  territories: TerritoryOption[];
  value: LocationStepData | null;
  onChange: (value: LocationStepData) => void;
  reusableItems?: CustomGuidanceLibraryItem[];
  onSaveReusable?: (category: CustomGuidanceCategory, label: string) => Promise<void>;
  onDeleteReusable?: (id: string) => Promise<void>;
  onApprove: () => void;
  loading?: boolean;
  issues?: Array<{ level: string; message: string }>;
}

export function LocationStep({
  territories,
  value,
  onChange,
  reusableItems,
  onSaveReusable,
  onDeleteReusable,
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
                customNotes: value?.customNotes,
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

      {value && (
        <CustomGuidanceField
          title="Internal note for this market"
          helperText="This does not change the selected market or landing page."
          category="market_notes"
          value={value.customNotes ? [value.customNotes] : []}
          onChange={(tags) => onChange({ ...value, customNotes: tags[tags.length - 1] ?? '' })}
          reusableItems={reusableItems}
          onSaveReusable={onSaveReusable}
          onDeleteReusable={onDeleteReusable}
          noteLabel="Add note"
          noteValue={value.customNotes ?? ''}
          onNoteChange={(note) => onChange({ ...value, customNotes: note })}
          disabled={loading}
        />
      )}
    </StepShell>
  );
}
