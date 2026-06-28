'use client';

import type {
  CustomGuidanceCategory,
  CustomGuidanceLibraryItem,
} from '@/lib/marketing/campaignBuilder/wizard/steps';
import styles from '../../CampaignBuilderTab.module.css';
import { CustomGuidanceField } from '../CustomGuidanceField';
import { StepShell } from '../StepShell';

export interface AudienceStepData {
  languageCode: 'en' | 'th';
  landingUrl: string;
  occasion?: string;
  productFocus?: string;
  customNotes?: string;
  customAudienceContexts?: string[];
  customOccasions?: string[];
  customDeliveryContexts?: string[];
}

interface AudienceStepProps {
  value: AudienceStepData;
  territoryName: string;
  defaultLandingUrl: string;
  audienceNotes: string;
  isExpansion: boolean;
  onChange: (value: AudienceStepData) => void;
  reusableItems?: CustomGuidanceLibraryItem[];
  onSaveReusable?: (category: CustomGuidanceCategory, label: string) => Promise<void>;
  onDeleteReusable?: (id: string) => Promise<void>;
  onApprove: () => void;
  onBack: () => void;
  loading?: boolean;
  issues?: Array<{ level: string; message: string }>;
}

const OCCASIONS = [
  'birthday',
  'anniversary',
  'romantic',
  'sympathy',
  'apology',
  'graduation',
  'get well soon',
  'new baby',
  'thank you',
  'wedding',
  'holiday gift',
  'general',
];

const AUDIENCE_CONTEXTS = [
  'tourists',
  'expats',
  'hotel guests',
  'villa guests',
  'condo residents',
  'private homes',
  'hospital delivery',
  'office delivery',
];

const DELIVERY_CONTEXTS = ['hotel', 'villa', 'condo', 'private house', 'hospital', 'office'];

export function AudienceStep({
  value,
  territoryName,
  defaultLandingUrl,
  audienceNotes,
  isExpansion,
  onChange,
  reusableItems,
  onSaveReusable,
  onDeleteReusable,
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

      <CustomGuidanceField
        title="Audience contexts"
        helperText="Use these as context for generation. They do not change geo targeting."
        category="audience_contexts"
        presetOptions={AUDIENCE_CONTEXTS}
        value={value.customAudienceContexts ?? []}
        onChange={(tags) => onChange({ ...value, customAudienceContexts: tags })}
        reusableItems={reusableItems}
        onSaveReusable={onSaveReusable}
        onDeleteReusable={onDeleteReusable}
        disabled={loading}
      />

      <CustomGuidanceField
        title="Occasion guidance"
        helperText="Add extra occasions that should influence ad groups, keywords, or copy."
        category="occasions"
        presetOptions={OCCASIONS.filter((occ) => occ !== 'general')}
        value={value.customOccasions ?? []}
        onChange={(tags) => onChange({ ...value, customOccasions: tags })}
        reusableItems={reusableItems}
        onSaveReusable={onSaveReusable}
        onDeleteReusable={onDeleteReusable}
        disabled={loading}
      />

      <CustomGuidanceField
        title="Delivery places"
        helperText="Safe context for delivery wording and intent ideas. Landing URL remains mechanically validated."
        category="delivery_contexts"
        presetOptions={DELIVERY_CONTEXTS}
        value={value.customDeliveryContexts ?? []}
        onChange={(tags) => onChange({ ...value, customDeliveryContexts: tags })}
        reusableItems={reusableItems}
        onSaveReusable={onSaveReusable}
        onDeleteReusable={onDeleteReusable}
        noteLabel="More audience guidance"
        noteValue={value.customNotes ?? ''}
        onNoteChange={(note) => onChange({ ...value, customNotes: note })}
        disabled={loading}
      />
    </StepShell>
  );
}
