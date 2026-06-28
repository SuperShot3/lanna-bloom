'use client';

import type {
  CustomGuidanceCategory,
  CustomGuidanceLibraryItem,
} from '@/lib/marketing/campaignBuilder/wizard/steps';
import styles from '../../CampaignBuilderTab.module.css';
import { CustomGuidanceField } from '../CustomGuidanceField';
import { StepShell } from '../StepShell';
import type { KeywordItem } from './KeywordsStep';

interface NegativeKeywordsStepProps {
  negativeKeywords: KeywordItem[];
  customNegativeThemes: string[];
  customNotes?: string;
  onChange: (keywords: KeywordItem[]) => void;
  onGuidanceChange: (guidance: { customNegativeThemes?: string[]; customNotes?: string }) => void;
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

export function NegativeKeywordsStep({
  negativeKeywords,
  customNegativeThemes,
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
}: NegativeKeywordsStepProps) {
  function updateText(index: number, text: string) {
    const next = [...negativeKeywords];
    next[index] = { ...next[index]!, text };
    onChange(next);
  }

  function remove(index: number) {
    onChange(negativeKeywords.filter((_, i) => i !== index));
  }

  function add() {
    onChange([...negativeKeywords, { text: '', matchType: 'PHRASE' }]);
  }

  return (
    <StepShell
      title="Negative keywords"
      hint="Global waste terms and cross-city blocks are applied first. AI can suggest extras only."
      badge={source ? `Source: ${source}` : undefined}
      onApprove={onApprove}
      onBack={onBack}
      loading={loading}
      issues={issues}
    >
      <CustomGuidanceField
        title="Terms or themes to avoid"
        helperText="Used only to suggest additional negatives. Global and cross-city safety negatives stay in place."
        category="negative_themes"
        presetOptions={['jobs', 'free', 'images', 'meaning', 'drawing', 'wholesale']}
        value={customNegativeThemes}
        onChange={(tags) => onGuidanceChange({ customNegativeThemes: tags, customNotes })}
        reusableItems={reusableItems}
        onSaveReusable={onSaveReusable}
        onDeleteReusable={onDeleteReusable}
        noteLabel="More negative keyword guidance"
        noteValue={customNotes ?? ''}
        onNoteChange={(note) => onGuidanceChange({ customNegativeThemes, customNotes: note })}
        disabled={loading}
      />

      <div className={styles.actions} style={{ marginTop: 0, marginBottom: 16 }}>
        <button
          type="button"
          className="admin-btn admin-btn-outline"
          onClick={onGenerate}
          disabled={generating || loading}
        >
          {generating ? 'Loading…' : 'Load negative library'}
        </button>
        <button type="button" className="admin-btn admin-btn-outline" onClick={add} disabled={loading}>
          Add negative
        </button>
      </div>

      <div className={styles.tagList}>
        {negativeKeywords.map((kw, i) => (
          <div key={i} style={{ display: 'flex', gap: 4, alignItems: 'center', width: '100%', marginBottom: 6 }}>
            <input
              className={styles.input}
              style={{ flex: 1 }}
              value={kw.text}
              onChange={(e) => updateText(i, e.target.value)}
              disabled={loading}
            />
            <button type="button" className="admin-btn admin-btn-outline" onClick={() => remove(i)} disabled={loading}>
              ×
            </button>
          </div>
        ))}
      </div>

      {negativeKeywords.length > 0 && (
        <p className={styles.hint}>{negativeKeywords.length} negative keywords</p>
      )}
    </StepShell>
  );
}
