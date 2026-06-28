'use client';

import type {
  CustomGuidanceCategory,
  CustomGuidanceLibraryItem,
} from '@/lib/marketing/campaignBuilder/wizard/steps';
import styles from '../../CampaignBuilderTab.module.css';
import { CustomGuidanceField } from '../CustomGuidanceField';
import { StepShell } from '../StepShell';

export interface KeywordItem {
  text: string;
  matchType: 'EXACT' | 'PHRASE';
}

export interface KeywordGroup {
  name: string;
  keywords: KeywordItem[];
}

interface KeywordsStepProps {
  adGroups: KeywordGroup[];
  customKeywordThemes: string[];
  customNotes?: string;
  onChange: (groups: KeywordGroup[]) => void;
  onGuidanceChange: (guidance: { customKeywordThemes?: string[]; customNotes?: string }) => void;
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

export function KeywordsStep({
  adGroups,
  customKeywordThemes,
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
}: KeywordsStepProps) {
  function updateKeyword(gi: number, ki: number, text: string) {
    const next = adGroups.map((g, i) =>
      i === gi
        ? {
            ...g,
            keywords: g.keywords.map((k, j) => (j === ki ? { ...k, text } : k)),
          }
        : g,
    );
    onChange(next);
  }

  function toggleMatchType(gi: number, ki: number) {
    const next = adGroups.map((g, i) =>
      i === gi
        ? {
            ...g,
            keywords: g.keywords.map((k, j) =>
              j === ki
                ? { ...k, matchType: k.matchType === 'EXACT' ? ('PHRASE' as const) : ('EXACT' as const) }
                : k,
            ),
          }
        : g,
    );
    onChange(next);
  }

  function addKeyword(gi: number) {
    const next = adGroups.map((g, i) =>
      i === gi ? { ...g, keywords: [...g.keywords, { text: '', matchType: 'PHRASE' as const }] } : g,
    );
    onChange(next);
  }

  function removeKeyword(gi: number, ki: number) {
    const next = adGroups.map((g, i) =>
      i === gi ? { ...g, keywords: g.keywords.filter((_, j) => j !== ki) } : g,
    );
    onChange(next);
  }

  return (
    <StepShell
      title="Keywords"
      hint="Exact and phrase match only. Keywords must match your selected territory — wrong-city terms are blocked."
      badge={source ? `Source: ${source}` : undefined}
      onApprove={onApprove}
      onBack={onBack}
      approveDisabled={adGroups.every((g) => g.keywords.length === 0)}
      loading={loading}
      issues={issues}
    >
      <CustomGuidanceField
        title="Keyword themes to include"
        helperText="Use high-intent English themes only. Wrong-city, Thai, broad, and low-intent terms are still blocked."
        category="keyword_themes"
        presetOptions={[
          'condo flower delivery',
          'hospital flowers',
          'graduation flowers',
          'private house delivery',
        ]}
        value={customKeywordThemes}
        onChange={(tags) => onGuidanceChange({ customKeywordThemes: tags, customNotes })}
        reusableItems={reusableItems}
        onSaveReusable={onSaveReusable}
        onDeleteReusable={onDeleteReusable}
        noteLabel="More keyword guidance"
        noteValue={customNotes ?? ''}
        onNoteChange={(note) => onGuidanceChange({ customKeywordThemes, customNotes: note })}
        disabled={loading}
      />

      <div className={styles.actions} style={{ marginTop: 0, marginBottom: 16 }}>
        <button
          type="button"
          className="admin-btn admin-btn-outline"
          onClick={onGenerate}
          disabled={generating || loading}
        >
          {generating ? 'Generating…' : aiAvailable ? 'Regenerate keywords' : 'Load rule-based keywords'}
        </button>
      </div>

      {adGroups.map((g, gi) => (
        <div key={g.name} className={styles.adGroupCard}>
          <h4 className={styles.subheading} style={{ marginTop: 0 }}>
            {g.name}
          </h4>
          {g.keywords.map((kw, ki) => (
            <div key={ki} style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
              <input
                className={styles.input}
                style={{ flex: 1, minWidth: 200 }}
                value={kw.text}
                onChange={(e) => updateKeyword(gi, ki, e.target.value)}
                disabled={loading}
                placeholder="keyword"
              />
              <button
                type="button"
                className={`${styles.chip} ${styles.chipSelected}`}
                onClick={() => toggleMatchType(gi, ki)}
                disabled={loading}
              >
                {kw.matchType}
              </button>
              <button
                type="button"
                className="admin-btn admin-btn-outline"
                onClick={() => removeKeyword(gi, ki)}
                disabled={loading}
              >
                Remove
              </button>
            </div>
          ))}
          <button type="button" className="admin-btn admin-btn-outline" onClick={() => addKeyword(gi)} disabled={loading}>
            Add keyword
          </button>
        </div>
      ))}
    </StepShell>
  );
}
