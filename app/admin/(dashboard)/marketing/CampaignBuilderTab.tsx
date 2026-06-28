'use client';

import { useCallback, useEffect, useState } from 'react';
import type {
  CampaignDraftRecord,
  CampaignValidationResult,
  FollowUpQuestion,
  GoogleAdsAssetSummary,
  SearchCampaignDraft,
} from '@/lib/marketing/campaignBuilder/types';

interface CampaignBuilderTabProps {
  isOwner: boolean;
  googleAdsConfigured: boolean;
  llmConfigured: boolean;
}

export function CampaignBuilderTab({ isOwner, googleAdsConfigured, llmConfigured }: CampaignBuilderTabProps) {
  const [prompt, setPrompt] = useState('');
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [questions, setQuestions] = useState<FollowUpQuestion[]>([]);
  const [activeDraft, setActiveDraft] = useState<CampaignDraftRecord | null>(null);
  const [drafts, setDrafts] = useState<CampaignDraftRecord[]>([]);
  const [assets, setAssets] = useState<GoogleAdsAssetSummary[]>([]);
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validation, setValidation] = useState<CampaignValidationResult | null>(null);
  const [createResult, setCreateResult] = useState<string[] | null>(null);

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
    setLoading(true);
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
      setLoading(false);
    }
  }

  async function generateDraft(forceGenerate = false) {
    if (!isOwner) return;
    setLoading(true);
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
      setLoading(false);
    }
  }

  async function saveDraftEdits(draft: SearchCampaignDraft) {
    if (!activeDraft || !isOwner) return;
    setLoading(true);
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
      setLoading(false);
    }
  }

  async function validateDraft() {
    if (!activeDraft || !isOwner) return;
    setLoading(true);
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
      setLoading(false);
    }
  }

  async function createCampaign(dryRun: boolean) {
    if (!activeDraft || !isOwner) return;
    setLoading(true);
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
      setLoading(false);
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

  const campaignDraft = activeDraft?.campaignDraft;

  return (
    <div>
      {!isOwner && (
        <p className="admin-hint" style={{ marginBottom: 16 }}>
          Only owners can generate and create campaigns. You can view drafts.
        </p>
      )}

      {!googleAdsConfigured && (
        <div className="admin-card" style={{ marginBottom: 16 }}>
          <p>Configure Google Ads env vars to use Campaign Builder. See <code>.env.example</code>.</p>
        </div>
      )}

      <section className="admin-card" style={{ marginBottom: 16 }}>
        <h3 className="admin-section-title">Describe your campaign</h3>
        <p className="admin-hint" style={{ marginBottom: 12 }}>
          English-only Search campaigns. Example: &quot;Launch a search campaign for flower delivery in Phuket with 500 THB per day, focus on birthday flowers and same-day delivery.&quot;
        </p>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={4}
          style={{ width: '100%', padding: 8, fontSize: 14 }}
          placeholder="Describe territory, budget, occasion, and landing page..."
          disabled={!isOwner}
        />
        {isOwner && (
          <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            <button type="button" className="admin-btn" onClick={checkQuestions} disabled={loading || !prompt.trim()}>
              Check for missing details
            </button>
            <button
              type="button"
              className="admin-btn admin-btn-primary"
              onClick={() => generateDraft(questions.length === 0)}
              disabled={loading || !prompt.trim() || !googleAdsConfigured}
            >
              Generate draft
            </button>
          </div>
        )}
      </section>

      {questions.length > 0 && (
        <section className="admin-card" style={{ marginBottom: 16 }}>
          <h3 className="admin-section-title">Follow-up questions</h3>
          {questions.map((q) => (
            <div key={q.id} style={{ marginBottom: 12 }}>
              <label className="admin-hint" style={{ display: 'block', marginBottom: 4 }}>
                {q.question}
                {q.required && ' *'}
              </label>
              {q.type === 'select' && q.options ? (
                <select
                  value={String(answers[q.field] ?? '')}
                  onChange={(e) => updateAnswer(q.field, e.target.value)}
                  style={{ width: '100%', maxWidth: 320 }}
                >
                  <option value="">Select…</option>
                  {q.options.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              ) : q.type === 'boolean' ? (
                <select
                  value={answers[q.field] === undefined ? '' : String(answers[q.field])}
                  onChange={(e) => updateAnswer(q.field, e.target.value === 'true')}
                  style={{ width: '100%', maxWidth: 200 }}
                >
                  <option value="">Default (yes)</option>
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              ) : q.type === 'number' ? (
                <input
                  type="number"
                  value={answers[q.field] != null ? String(answers[q.field]) : ''}
                  onChange={(e) => updateAnswer(q.field, Number(e.target.value))}
                  style={{ width: '100%', maxWidth: 200, padding: 6 }}
                />
              ) : (
                <input
                  type={q.type === 'url' ? 'url' : 'text'}
                  value={String(answers[q.field] ?? '')}
                  onChange={(e) => updateAnswer(q.field, e.target.value)}
                  style={{ width: '100%', padding: 6 }}
                  placeholder={q.type === 'url' ? 'https://lannabloom.shop/en/...' : ''}
                />
              )}
            </div>
          ))}
        </section>
      )}

      {campaignDraft && activeDraft && (
        <section className="admin-card" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
            <div>
              <h3 className="admin-section-title" style={{ margin: 0 }}>{campaignDraft.campaignName}</h3>
              <p className="admin-hint">
                Status: {activeDraft.status} · {campaignDraft.territory} · {campaignDraft.dailyBudgetThb} THB/day · English Search
              </p>
            </div>
            {isOwner && activeDraft.status !== 'created' && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button type="button" className="admin-btn" onClick={validateDraft} disabled={loading}>
                  Validate / Dry run
                </button>
                <button type="button" className="admin-btn" onClick={() => createCampaign(true)} disabled={loading}>
                  Preview create (dry run)
                </button>
                <button
                  type="button"
                  className="admin-btn admin-btn-primary"
                  onClick={() => createCampaign(false)}
                  disabled={loading || !validation?.ok}
                >
                  Create paused campaign
                </button>
              </div>
            )}
          </div>

          {validation && (
            <div style={{ marginBottom: 16, padding: 12, background: validation.ok ? '#f0fdf4' : '#fef2f2', borderRadius: 8 }}>
              <strong>Validation: {validation.ok ? 'Passed' : 'Failed'}</strong>
              <span style={{ marginLeft: 8, fontSize: 12 }}>Risk: {validation.estimatedRisk}</span>
              {validation.issues.length > 0 && (
                <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
                  {validation.issues.map((issue, i) => (
                    <li key={`${issue.code}-${i}`} style={{ color: issue.level === 'error' ? '#b91c1c' : '#92400e' }}>
                      {issue.message}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {createResult && (
            <div style={{ marginBottom: 16, padding: 12, background: '#eff6ff', borderRadius: 8 }}>
              <strong>Google Ads resources ({createResult.length})</strong>
              <ul style={{ margin: '8px 0 0', paddingLeft: 20, fontSize: 12, wordBreak: 'break-all' }}>
                {createResult.slice(0, 20).map((name) => (
                  <li key={name}>{name}</li>
                ))}
                {createResult.length > 20 && <li>…and {createResult.length - 20} more</li>}
              </ul>
            </div>
          )}

          <h4 style={{ marginTop: 16 }}>Ad groups & keywords</h4>
          {campaignDraft.adGroups.map((group, gi) => (
            <div key={group.name} style={{ marginBottom: 16, padding: 12, border: '1px solid #eee', borderRadius: 8 }}>
              <strong>{group.name}</strong>
              <p className="admin-hint" style={{ margin: '4px 0' }}>Final URL: {group.finalUrl}</p>
              <p style={{ fontSize: 13, margin: '8px 0 4px' }}>Keywords:</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {group.keywords.map((kw, ki) => (
                  <span key={`${gi}-${ki}`} style={{ fontSize: 12, padding: '2px 8px', background: '#f3f4f6', borderRadius: 4 }}>
                    [{kw.matchType}] {kw.text}
                  </span>
                ))}
              </div>
              <p style={{ fontSize: 13, margin: '8px 0 4px' }}>Headlines:</p>
              <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13 }}>
                {group.headlines.map((h) => <li key={h}>{h}</li>)}
              </ul>
              <p style={{ fontSize: 13, margin: '8px 0 4px' }}>Descriptions:</p>
              <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13 }}>
                {group.descriptions.map((d) => <li key={d}>{d}</li>)}
              </ul>
            </div>
          ))}

          <h4>Negative keywords ({campaignDraft.negativeKeywords.length})</h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
            {campaignDraft.negativeKeywords.slice(0, 30).map((kw) => (
              <span key={kw.text} style={{ fontSize: 12, padding: '2px 8px', background: '#fee2e2', borderRadius: 4 }}>
                -{kw.text}
              </span>
            ))}
            {campaignDraft.negativeKeywords.length > 30 && (
              <span className="admin-hint">+{campaignDraft.negativeKeywords.length - 30} more</span>
            )}
          </div>

          {assets.length > 0 && isOwner && activeDraft.status !== 'created' && (
            <>
              <h4>Optional image assets</h4>
              <p className="admin-hint">Select existing Google Ads image assets to attach (optional for Search).</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                {assets.map((asset) => (
                  <label
                    key={asset.resourceName}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 4,
                      padding: 8,
                      border: selectedAssets.includes(asset.resourceName) ? '2px solid #2563eb' : '1px solid #ddd',
                      borderRadius: 8,
                      cursor: 'pointer',
                      maxWidth: 120,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedAssets.includes(asset.resourceName)}
                      onChange={() => toggleAsset(asset.resourceName)}
                      style={{ marginBottom: 4 }}
                    />
                    {asset.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={asset.imageUrl} alt={asset.name} style={{ width: 80, height: 80, objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: 80, height: 80, background: '#f3f4f6' }} />
                    )}
                    <span style={{ fontSize: 11, textAlign: 'center' }}>{asset.name}</span>
                  </label>
                ))}
              </div>
              <button
                type="button"
                className="admin-btn"
                style={{ marginTop: 12 }}
                onClick={() => saveDraftEdits(campaignDraft)}
                disabled={loading}
              >
                Save asset selection
              </button>
            </>
          )}

          {activeDraft.applyError && (
            <p style={{ color: '#b91c1c', marginTop: 12 }}>{activeDraft.applyError}</p>
          )}
        </section>
      )}

      {drafts.length > 0 && (
        <section className="admin-card">
          <h3 className="admin-section-title">Recent drafts</h3>
          <ul style={{ margin: 0, paddingLeft: 0, listStyle: 'none' }}>
            {drafts.map((d) => (
              <li
                key={d.id}
                style={{ borderBottom: '1px solid #eee', padding: '8px 0', cursor: 'pointer' }}
                onClick={() => {
                  setActiveDraft(d);
                  setValidation(d.validationResult);
                  setSelectedAssets(d.selectedAssetResourceNames);
                  setPrompt(d.naturalLanguagePrompt);
                  setAnswers(d.questionAnswers);
                }}
              >
                <strong>{d.campaignDraft?.campaignName ?? 'Untitled draft'}</strong>
                <span style={{ marginLeft: 8, fontSize: 12, color: '#666' }}>{d.status}</span>
                <p className="admin-hint" style={{ margin: '2px 0 0' }}>
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
