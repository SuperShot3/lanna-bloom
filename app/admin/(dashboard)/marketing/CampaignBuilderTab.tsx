'use client';

import { useCallback, useEffect, useState } from 'react';
import type {
  CampaignDraftRecord,
  CampaignValidationResult,
  FollowUpQuestion,
  GoogleAdsAssetSummary,
  SearchCampaignDraft,
} from '@/lib/marketing/campaignBuilder/types';
import styles from './CampaignBuilderTab.module.css';

interface CampaignBuilderTabProps {
  isOwner: boolean;
  googleAdsConfigured: boolean;
  llmConfigured: boolean;
}

type LoadingAction =
  | 'questions'
  | 'generate'
  | 'save'
  | 'validate'
  | 'create-dry'
  | 'create'
  | null;

const LOADING_MESSAGES: Record<Exclude<LoadingAction, null>, { title: string; hint?: string }> = {
  questions: {
    title: 'Checking your campaign details…',
    hint: 'Looking for missing territory, budget, or landing page.',
  },
  generate: {
    title: 'Building your campaign draft…',
    hint: 'Creating keyword groups, ad copy, and negative keywords.',
  },
  save: {
    title: 'Saving changes…',
  },
  validate: {
    title: 'Validating draft…',
    hint: 'Checking budget, URLs, and ad copy limits.',
  },
  'create-dry': {
    title: 'Running dry run…',
    hint: 'Previewing Google Ads resources without creating anything.',
  },
  create: {
    title: 'Creating paused campaign…',
    hint: 'Setting up budget, ad groups, and keywords in Google Ads.',
  },
};

function BooleanChips({
  value,
  onChange,
}: {
  value: boolean | undefined;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className={styles.chipGroup} role="group">
      <button
        type="button"
        className={`${styles.chip} ${value === true ? styles.chipSelected : ''}`}
        onClick={() => onChange(true)}
        aria-pressed={value === true}
      >
        Yes
      </button>
      <button
        type="button"
        className={`${styles.chip} ${value === false ? styles.chipSelected : ''}`}
        onClick={() => onChange(false)}
        aria-pressed={value === false}
      >
        No
      </button>
    </div>
  );
}

function SelectChips({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className={styles.chipGrid} role="listbox" aria-label="Select option">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          role="option"
          aria-selected={value === opt}
          className={`${styles.chip} ${value === opt ? styles.chipSelected : ''}`}
          onClick={() => onChange(opt)}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

function LoadingOverlay({ action }: { action: Exclude<LoadingAction, null> }) {
  const msg = LOADING_MESSAGES[action];
  return (
    <div className={styles.loadingOverlay} role="status" aria-live="polite" aria-busy="true">
      <div className={styles.loadingCard}>
        <div className={styles.spinner} aria-hidden="true" />
        <p>{msg.title}</p>
        {msg.hint && <p className={styles.loadingHint}>{msg.hint}</p>}
      </div>
    </div>
  );
}

export function CampaignBuilderTab({ isOwner, googleAdsConfigured, llmConfigured }: CampaignBuilderTabProps) {
  const [prompt, setPrompt] = useState('');
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [questions, setQuestions] = useState<FollowUpQuestion[]>([]);
  const [activeDraft, setActiveDraft] = useState<CampaignDraftRecord | null>(null);
  const [drafts, setDrafts] = useState<CampaignDraftRecord[]>([]);
  const [assets, setAssets] = useState<GoogleAdsAssetSummary[]>([]);
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);
  const [loadingAction, setLoadingAction] = useState<LoadingAction>(null);
  const [error, setError] = useState<string | null>(null);
  const [validation, setValidation] = useState<CampaignValidationResult | null>(null);
  const [createResult, setCreateResult] = useState<string[] | null>(null);

  const loading = loadingAction !== null;

  const loadDrafts = useCallback(async () => {
    const res = await fetch('/api/admin/marketing/campaign-drafts');
    if (res.ok) {
      const data = await res.json();
      setDrafts(data.drafts ?? []);
    }
  }, []);

  const loadAssets = useCallback(async () => {
    const res = await fetch('/api/admin/marketing/assets');
    if (res.ok) {
      const data = await res.json();
      setAssets(data.assets ?? []);
    }
  }, []);

  useEffect(() => {
    loadDrafts();
    if (googleAdsConfigured) loadAssets();
  }, [loadDrafts, loadAssets, googleAdsConfigured]);

  async function checkQuestions() {
    setLoadingAction('questions');
    setError(null);
    try {
      const res = await fetch('/api/admin/marketing/campaign-drafts/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, answers }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to check questions');
      setQuestions(data.questions ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to check questions');
    } finally {
      setLoadingAction(null);
    }
  }

  async function generateDraft(forceGenerate = false) {
    if (!isOwner) return;
    setLoadingAction('generate');
    setError(null);
    setValidation(null);
    setCreateResult(null);
    try {
      const res = await fetch('/api/admin/marketing/campaign-drafts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, answers, forceGenerate, useLlm: llmConfigured }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.questions) setQuestions(data.questions);
        throw new Error(data.error ?? 'Generation failed');
      }
      setActiveDraft(data.draft);
      setQuestions([]);
      setSelectedAssets(data.draft?.selectedAssetResourceNames ?? []);
      await loadDrafts();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generation failed');
    } finally {
      setLoadingAction(null);
    }
  }

  async function saveDraftEdits(draft: SearchCampaignDraft) {
    if (!activeDraft || !isOwner) return;
    setLoadingAction('save');
    setError(null);
    try {
      const res = await fetch(`/api/admin/marketing/campaign-drafts/${activeDraft.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignDraft: draft,
          selectedAssetResourceNames: selectedAssets,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Save failed');
      setActiveDraft(data.draft);
      setValidation(null);
      await loadDrafts();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setLoadingAction(null);
    }
  }

  async function validateDraft() {
    if (!activeDraft || !isOwner) return;
    setLoadingAction('validate');
    setError(null);
    try {
      const res = await fetch(`/api/admin/marketing/campaign-drafts/${activeDraft.id}/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dryRun: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Validation failed');
      setActiveDraft(data.draft);
      setValidation(data.validation);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Validation failed');
    } finally {
      setLoadingAction(null);
    }
  }

  async function createCampaign(dryRun: boolean) {
    if (!activeDraft || !isOwner) return;
    setLoadingAction(dryRun ? 'create-dry' : 'create');
    setError(null);
    setCreateResult(null);
    try {
      const res = await fetch(`/api/admin/marketing/campaign-drafts/${activeDraft.id}/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dryRun }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.validation) setValidation(data.validation);
        throw new Error(data.error ?? 'Create failed');
      }
      if (dryRun) {
        setCreateResult(data.resourceNames ?? []);
        setValidation(data.validation);
      } else {
        setActiveDraft(data.draft);
        setCreateResult(data.resourceNames ?? []);
        await loadDrafts();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Create failed');
    } finally {
      setLoadingAction(null);
    }
  }

  function updateAnswer(field: string, value: unknown) {
    setAnswers((prev) => ({ ...prev, [field]: value }));
  }

  function toggleAsset(resourceName: string) {
    setSelectedAssets((prev) =>
      prev.includes(resourceName) ? prev.filter((n) => n !== resourceName) : [...prev, resourceName],
    );
  }

  function renderQuestionInput(q: FollowUpQuestion) {
    if (q.type === 'boolean') {
      const boolVal = answers[q.field] === undefined ? undefined : Boolean(answers[q.field]);
      return <BooleanChips value={boolVal} onChange={(v) => updateAnswer(q.field, v)} />;
    }

    if (q.type === 'select' && q.options) {
      return (
        <SelectChips
          options={q.options}
          value={String(answers[q.field] ?? '')}
          onChange={(v) => updateAnswer(q.field, v)}
        />
      );
    }

    if (q.type === 'number') {
      return (
        <input
          type="number"
          inputMode="numeric"
          className={styles.input}
          value={answers[q.field] != null ? String(answers[q.field]) : ''}
          onChange={(e) => updateAnswer(q.field, Number(e.target.value))}
          placeholder="e.g. 500"
        />
      );
    }

    return (
      <input
        type={q.type === 'url' ? 'url' : 'text'}
        className={styles.input}
        value={String(answers[q.field] ?? '')}
        onChange={(e) => updateAnswer(q.field, e.target.value)}
        placeholder={q.type === 'url' ? 'https://lannabloom.shop/en/...' : ''}
      />
    );
  }

  const campaignDraft = activeDraft?.campaignDraft;

  return (
    <div className={styles.root}>
      {loadingAction && <LoadingOverlay action={loadingAction} />}

      {!isOwner && (
        <p className={styles.ownerHint}>
          Only owners can generate and create campaigns. You can view drafts.
        </p>
      )}

      {error && (
        <div className={styles.errorBanner} role="alert">
          {error}
        </div>
      )}

      <section className={styles.card}>
        <h3 className={styles.sectionTitle}>Describe your campaign</h3>
        <p className={styles.hint}>
          English-only Search campaigns. Include territory, daily budget, occasion, and landing page when you can.
        </p>
        <textarea
          className={styles.textarea}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={4}
          placeholder="e.g. Launch a search campaign for flower delivery in Phuket with 500 THB per day, focus on birthday flowers…"
          disabled={!isOwner || loading}
        />
        {isOwner && (
          <div className={styles.actions}>
            <button
              type="button"
              className={`admin-btn ${styles.btnFull}`}
              onClick={checkQuestions}
              disabled={loading || !prompt.trim()}
            >
              Check missing details
            </button>
            <button
              type="button"
              className={`admin-btn admin-btn-primary ${styles.btnFull}`}
              onClick={() => generateDraft(questions.length === 0)}
              disabled={loading || !prompt.trim() || !googleAdsConfigured}
            >
              Generate draft
            </button>
          </div>
        )}
      </section>

      {questions.length > 0 && (
        <section className={styles.card}>
          <h3 className={styles.sectionTitle}>A few quick questions</h3>
          <p className={styles.hint}>Tap to answer — then generate your draft.</p>
          {questions.map((q) => (
            <div key={q.id} className={styles.questionBlock}>
              <span className={styles.questionLabel}>
                {q.question}
                {q.required && <span className={styles.required}> *</span>}
              </span>
              {renderQuestionInput(q)}
            </div>
          ))}
          {isOwner && (
            <div className={styles.actions} style={{ marginTop: 8 }}>
              <button
                type="button"
                className={`admin-btn admin-btn-primary ${styles.btnFull}`}
                onClick={() => generateDraft(true)}
                disabled={loading || !prompt.trim() || !googleAdsConfigured}
              >
                Generate draft with answers
              </button>
            </div>
          )}
        </section>
      )}

      {campaignDraft && activeDraft && (
        <section className={styles.card}>
          <div className={styles.draftHeader}>
            <div>
              <h3 className={styles.sectionTitle}>{campaignDraft.campaignName}</h3>
              <div className={styles.draftMeta}>
                <span className={`${styles.metaPill} ${styles.metaPillStatus}`}>{activeDraft.status}</span>
                <span className={styles.metaPill}>{campaignDraft.territory}</span>
                <span className={styles.metaPill}>{campaignDraft.dailyBudgetThb} THB/day</span>
                <span className={styles.metaPill}>English Search</span>
              </div>
            </div>
            {isOwner && activeDraft.status !== 'created' && (
              <div className={styles.btnStack}>
                <button type="button" className={`admin-btn ${styles.btnFull}`} onClick={validateDraft} disabled={loading}>
                  Validate
                </button>
                <button type="button" className={`admin-btn ${styles.btnFull}`} onClick={() => createCampaign(true)} disabled={loading}>
                  Preview (dry run)
                </button>
                <button
                  type="button"
                  className={`admin-btn admin-btn-primary ${styles.btnFull}`}
                  onClick={() => createCampaign(false)}
                  disabled={loading || !validation?.ok}
                >
                  Create paused campaign
                </button>
              </div>
            )}
          </div>

          {validation && (
            <div className={`${styles.alert} ${validation.ok ? styles.alertOk : styles.alertError}`}>
              <span className={styles.alertTitle}>
                Validation {validation.ok ? 'passed' : 'failed'}
              </span>
              {' · '}
              Risk: {validation.estimatedRisk}
              {validation.issues.length > 0 && (
                <ul className={styles.issueList}>
                  {validation.issues.map((issue, i) => (
                    <li
                      key={`${issue.code}-${i}`}
                      className={issue.level === 'error' ? styles.issueError : styles.issueWarning}
                    >
                      {issue.message}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {createResult && (
            <div className={`${styles.alert} ${styles.alertInfo}`}>
              <span className={styles.alertTitle}>Google Ads resources ({createResult.length})</span>
              <ul className={styles.issueList} style={{ fontSize: '0.75rem', wordBreak: 'break-all' }}>
                {createResult.slice(0, 15).map((name) => (
                  <li key={name}>{name}</li>
                ))}
                {createResult.length > 15 && <li>…and {createResult.length - 15} more</li>}
              </ul>
            </div>
          )}

          <h4 className={styles.subheading}>Ad groups & keywords</h4>
          {campaignDraft.adGroups.map((group, gi) => (
            <div key={group.name} className={styles.adGroupCard}>
              <strong>{group.name}</strong>
              <p className={styles.hint} style={{ margin: '4px 0 8px', fontSize: '0.8125rem' }}>
                {group.finalUrl}
              </p>
              <div className={styles.tagList}>
                {group.keywords.map((kw, ki) => (
                  <span key={`${gi}-${ki}`} className={styles.tag}>
                    [{kw.matchType}] {kw.text}
                  </span>
                ))}
              </div>
              <p className={styles.hint} style={{ margin: '10px 0 4px', fontSize: '0.8125rem' }}>Headlines</p>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: '0.8125rem' }}>
                {group.headlines.map((h) => <li key={h}>{h}</li>)}
              </ul>
            </div>
          ))}

          <h4 className={styles.subheading}>
            Negative keywords ({campaignDraft.negativeKeywords.length})
          </h4>
          <div className={styles.tagList} style={{ marginBottom: 16 }}>
            {campaignDraft.negativeKeywords.slice(0, 24).map((kw) => (
              <span key={kw.text} className={`${styles.tag} ${styles.tagNegative}`}>
                −{kw.text}
              </span>
            ))}
            {campaignDraft.negativeKeywords.length > 24 && (
              <span className={styles.hint}>+{campaignDraft.negativeKeywords.length - 24} more</span>
            )}
          </div>

          {assets.length > 0 && isOwner && activeDraft.status !== 'created' && (
            <>
              <h4 className={styles.subheading}>Optional image assets</h4>
              <p className={styles.hint}>Tap to select existing Google Ads images (optional).</p>
              <div className={styles.assetGrid}>
                {assets.map((asset) => {
                  const selected = selectedAssets.includes(asset.resourceName);
                  return (
                    <button
                      key={asset.resourceName}
                      type="button"
                      className={`${styles.assetCard} ${selected ? styles.assetCardSelected : ''}`}
                      onClick={() => toggleAsset(asset.resourceName)}
                      aria-pressed={selected}
                    >
                      {asset.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={asset.imageUrl} alt="" className={styles.assetThumb} />
                      ) : (
                        <div className={styles.assetThumb} />
                      )}
                      <span className={styles.assetName}>{asset.name}</span>
                    </button>
                  );
                })}
              </div>
              <div className={styles.actions} style={{ marginTop: 12 }}>
                <button
                  type="button"
                  className={`admin-btn ${styles.btnFull}`}
                  onClick={() => saveDraftEdits(campaignDraft)}
                  disabled={loading}
                >
                  Save asset selection
                </button>
              </div>
            </>
          )}

          {activeDraft.applyError && (
            <div className={styles.errorBanner} style={{ marginTop: 12, marginBottom: 0 }}>
              {activeDraft.applyError}
            </div>
          )}
        </section>
      )}

      {drafts.length > 0 && (
        <section className={styles.card}>
          <h3 className={styles.sectionTitle}>Recent drafts</h3>
          <ul className={styles.draftList}>
            {drafts.map((d) => (
              <li
                key={d.id}
                className={styles.draftItem}
                onClick={() => {
                  setActiveDraft(d);
                  setValidation(d.validationResult);
                  setSelectedAssets(d.selectedAssetResourceNames);
                  setPrompt(d.naturalLanguagePrompt);
                  setAnswers(d.questionAnswers);
                  setError(null);
                  setCreateResult(null);
                }}
              >
                <div className={styles.draftItemTitle}>
                  {d.campaignDraft?.campaignName ?? 'Untitled draft'}
                  <span className={styles.metaPill} style={{ marginLeft: 8, verticalAlign: 'middle' }}>
                    {d.status}
                  </span>
                </div>
                <p className={styles.draftItemMeta}>
                  {new Date(d.createdAt).toLocaleString()} · {d.adminEmail}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
