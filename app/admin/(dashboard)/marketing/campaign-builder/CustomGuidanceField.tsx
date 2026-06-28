'use client';

import { useMemo, useState } from 'react';
import type {
  CustomGuidanceCategory,
  CustomGuidanceLibraryItem,
} from '@/lib/marketing/campaignBuilder/wizard/steps';
import styles from '../CampaignBuilderTab.module.css';

interface CustomGuidanceFieldProps {
  title: string;
  helperText: string;
  category: CustomGuidanceCategory;
  presetOptions?: string[];
  value: string[];
  onChange: (tags: string[]) => void;
  reusableItems?: CustomGuidanceLibraryItem[];
  onSaveReusable?: (category: CustomGuidanceCategory, label: string) => Promise<void>;
  onDeleteReusable?: (id: string) => Promise<void>;
  noteLabel?: string;
  noteValue?: string;
  onNoteChange?: (note: string) => void;
  disabled?: boolean;
}

function normalizeKey(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

function cleanLabel(value: string): string {
  return value.trim().replace(/\s+/g, ' ').slice(0, 48);
}

export function CustomGuidanceField({
  title,
  helperText,
  category,
  presetOptions = [],
  value,
  onChange,
  reusableItems = [],
  onSaveReusable,
  onDeleteReusable,
  noteLabel,
  noteValue,
  onNoteChange,
  disabled,
}: CustomGuidanceFieldProps) {
  const [input, setInput] = useState('');
  const [savingLabel, setSavingLabel] = useState<string | null>(null);
  const selectedKeys = useMemo(() => new Set(value.map(normalizeKey)), [value]);
  const savedForCategory = reusableItems.filter((item) => item.category === category);
  const savedKeys = new Set(savedForCategory.map((item) => normalizeKey(item.label)));
  const presetKeys = new Set(presetOptions.map(normalizeKey));

  function addTag(label: string) {
    const clean = cleanLabel(label);
    if (!clean || selectedKeys.has(normalizeKey(clean))) return;
    onChange([...value, clean]);
    setInput('');
  }

  function removeTag(label: string) {
    const key = normalizeKey(label);
    onChange(value.filter((tag) => normalizeKey(tag) !== key));
  }

  async function saveTag(label: string) {
    if (!onSaveReusable) return;
    setSavingLabel(label);
    try {
      await onSaveReusable(category, label);
    } finally {
      setSavingLabel(null);
    }
  }

  return (
    <div className={styles.guidanceBox}>
      <div className={styles.guidanceHeader}>
        <div>
          <h4 className={styles.subheading} style={{ marginTop: 0 }}>
            {title}
          </h4>
          <p className={styles.hint}>{helperText}</p>
        </div>
      </div>

      {presetOptions.length > 0 && (
        <div className={styles.chipGrid} aria-label={`${title} presets`}>
          {presetOptions.map((option) => {
            const selected = selectedKeys.has(normalizeKey(option));
            return (
              <button
                key={option}
                type="button"
                className={`${styles.chip} ${selected ? styles.chipSelected : ''}`}
                onClick={() => (selected ? removeTag(option) : addTag(option))}
                disabled={disabled}
              >
                {option}
              </button>
            );
          })}
        </div>
      )}

      {savedForCategory.length > 0 && (
        <>
          <p className={styles.hint} style={{ marginTop: 12, marginBottom: 6 }}>
            Saved reusable chips
          </p>
          <div className={styles.guidanceSavedList}>
            {savedForCategory.map((item) => {
              const selected = selectedKeys.has(normalizeKey(item.label));
              return (
                <span key={item.id} className={styles.guidanceSavedItem}>
                  <button
                    type="button"
                    className={`${styles.guidanceSavedChip} ${selected ? styles.guidanceSavedChipSelected : ''}`}
                    onClick={() => (selected ? removeTag(item.label) : addTag(item.label))}
                    disabled={disabled}
                  >
                    {item.label}
                  </button>
                  {onDeleteReusable && (
                    <button
                      type="button"
                      className={styles.guidanceIconButton}
                      onClick={() => onDeleteReusable(item.id)}
                      disabled={disabled}
                      aria-label={`Delete saved guidance ${item.label}`}
                    >
                      ×
                    </button>
                  )}
                </span>
              );
            })}
          </div>
        </>
      )}

      <div className={styles.guidanceInputRow}>
        <input
          className={styles.input}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              addTag(input);
            }
          }}
          placeholder="Add custom tag"
          disabled={disabled}
          maxLength={48}
        />
        <button
          type="button"
          className="admin-btn admin-btn-outline"
          onClick={() => addTag(input)}
          disabled={disabled || !input.trim()}
        >
          Add
        </button>
      </div>

      {value.length > 0 && (
        <div className={styles.guidanceSelectedList}>
          {value.map((tag) => {
            const tagKey = normalizeKey(tag);
            const canSave = onSaveReusable && !savedKeys.has(tagKey) && !presetKeys.has(tagKey);
            return (
              <span key={tag} className={styles.guidanceSelectedTag}>
                {tag}
                {canSave && (
                  <button
                    type="button"
                    className={styles.guidanceTextButton}
                    onClick={() => saveTag(tag)}
                    disabled={disabled || savingLabel === tag}
                  >
                    {savingLabel === tag ? 'Saving…' : 'Save'}
                  </button>
                )}
                <button
                  type="button"
                  className={styles.guidanceIconButton}
                  onClick={() => removeTag(tag)}
                  disabled={disabled}
                  aria-label={`Remove guidance ${tag}`}
                >
                  ×
                </button>
              </span>
            );
          })}
        </div>
      )}

      {noteLabel && onNoteChange && (
        <details className={styles.guidanceNote}>
          <summary>{noteLabel}</summary>
          <textarea
            className={styles.textarea}
            rows={2}
            value={noteValue ?? ''}
            onChange={(event) => onNoteChange(event.target.value)}
            disabled={disabled}
            maxLength={240}
          />
        </details>
      )}
    </div>
  );
}
