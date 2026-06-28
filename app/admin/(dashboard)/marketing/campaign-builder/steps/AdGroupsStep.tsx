'use client';

import type {
  CustomGuidanceCategory,
  CustomGuidanceLibraryItem,
} from '@/lib/marketing/campaignBuilder/wizard/steps';
import styles from '../../CampaignBuilderTab.module.css';
import { CustomGuidanceField } from '../CustomGuidanceField';
import { StepShell } from '../StepShell';

export interface AdGroupItem {
  name: string;
}

interface AdGroupsStepProps {
  adGroups: AdGroupItem[];
  customAdGroupIdeas: string[];
  customNotes?: string;
  onChange: (groups: AdGroupItem[]) => void;
  onGuidanceChange: (guidance: { customAdGroupIdeas?: string[]; customNotes?: string }) => void;
  reusableItems?: CustomGuidanceLibraryItem[];
  onSaveReusable?: (category: CustomGuidanceCategory, label: string) => Promise<void>;
  onDeleteReusable?: (id: string) => Promise<void>;
  onGenerate: () => void;
  onApprove: () => void;
  onBack: () => void;
  loading?: boolean;
  generating?: boolean;
  aiAvailable: boolean;
  source?: string;
  issues?: Array<{ level: string; message: string }>;
}

export function AdGroupsStep({
  adGroups,
  customAdGroupIdeas,
  customNotes,
  onChange,
  onGuidanceChange,
  reusableItems,
  onSaveReusable,
  onDeleteReusable,
  onGenerate,
  onApprove,
  onBack,
  loading,
  generating,
  aiAvailable,
  source,
  issues,
}: AdGroupsStepProps) {
  function updateName(index: number, name: string) {
    const next = [...adGroups];
    next[index] = { name };
    onChange(next);
  }

  function addGroup() {
    if (adGroups.length >= 3) return;
    onChange([...adGroups, { name: '' }]);
  }

  function removeGroup(index: number) {
    onChange(adGroups.filter((_, i) => i !== index));
  }

  return (
    <StepShell
      title="Ad groups"
      hint="1–3 intent buckets. AI can suggest groups; you can rename, add, or remove."
      badge={source ? `Source: ${source}` : undefined}
      onApprove={onApprove}
      onBack={onBack}
      approveDisabled={adGroups.length === 0 || adGroups.some((g) => !g.name.trim())}
      loading={loading}
      issues={issues}
    >
      <CustomGuidanceField
        title="Custom intent ideas"
        helperText="Examples: hospital flower delivery, condo delivery, graduation flowers. Generation clusters these into 1-3 ad groups."
        category="ad_group_ideas"
        presetOptions={['hospital flower delivery', 'condo delivery', 'graduation flowers']}
        value={customAdGroupIdeas}
        onChange={(tags) => onGuidanceChange({ customAdGroupIdeas: tags, customNotes })}
        reusableItems={reusableItems}
        onSaveReusable={onSaveReusable}
        onDeleteReusable={onDeleteReusable}
        noteLabel="More ad group guidance"
        noteValue={customNotes ?? ''}
        onNoteChange={(note) => onGuidanceChange({ customAdGroupIdeas, customNotes: note })}
        disabled={loading}
      />

      <div className={styles.actions} style={{ marginTop: 0, marginBottom: 16 }}>
        <button
          type="button"
          className="admin-btn admin-btn-outline"
          onClick={onGenerate}
          disabled={generating || loading}
        >
          {generating ? 'Generating…' : aiAvailable ? 'Regenerate suggestions' : 'Load rule-based groups'}
        </button>
        {adGroups.length < 3 && (
          <button type="button" className="admin-btn admin-btn-outline" onClick={addGroup} disabled={loading}>
            Add group
          </button>
        )}
      </div>

      {adGroups.map((g, i) => (
        <div key={i} className={styles.questionBlock}>
          <label className={styles.questionLabel}>Ad group {i + 1}</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              className={styles.input}
              value={g.name}
              onChange={(e) => updateName(i, e.target.value)}
              disabled={loading}
            />
            {adGroups.length > 1 && (
              <button
                type="button"
                className="admin-btn admin-btn-outline"
                onClick={() => removeGroup(i)}
                disabled={loading}
                aria-label="Remove ad group"
              >
                Remove
              </button>
            )}
          </div>
        </div>
      ))}
    </StepShell>
  );
}
