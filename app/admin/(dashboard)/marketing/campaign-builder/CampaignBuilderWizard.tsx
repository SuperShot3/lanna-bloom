'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  CampaignDraftRecord,
  CampaignValidationResult,
} from '@/lib/marketing/campaignBuilder/types';
import {
  WIZARD_STEP_LABELS,
  WIZARD_STEP_ORDER,
  type WizardStepId,
} from '@/lib/marketing/campaignBuilder/wizard/steps';
import styles from '../CampaignBuilderTab.module.css';
import { AdCopyReviewCreateStep } from './steps/AdCopyReviewCreateStep';
import { AdGroupsStep } from './steps/AdGroupsStep';
import { AudienceStep, type AudienceStepData } from './steps/AudienceStep';
import { KeywordsStep } from './steps/KeywordsStep';
import { LocationStep, type LocationStepData, type TerritoryOption } from './steps/LocationStep';
import { NegativeKeywordsStep } from './steps/NegativeKeywordsStep';

interface CampaignBuilderWizardProps {
  isOwner: boolean;
  googleAdsConfigured: boolean;
  llmConfigured: boolean;
}

type LoadingAction =
  | 'create'
  | 'save'
  | 'generate'
  | 'approve'
  | 'validate'
  | 'create-dry'
  | 'create-live'
  | null;

function stepIndex(step: WizardStepId): number {
  return WIZARD_STEP_ORDER.indexOf(step);
}

function isStepComplete(draft: CampaignDraftRecord, step: WizardStepId): boolean {
  return Boolean(draft.stepApprovals[step]?.approvedAt);
}

function getDraftProgress(draft: CampaignDraftRecord): string {
  const current = stepIndex(draft.wizardStep as WizardStepId) + 1;
  const loc = draft.stepOutputs.location as { territoryName?: string } | undefined;
  const territory = loc?.territoryName ?? draft.structuredBrief?.territory ?? '—';
  return `Step ${current}/6 · ${territory} · ${draft.status}`;
}

export function CampaignBuilderWizard({
  isOwner,
  googleAdsConfigured,
  llmConfigured,
}: CampaignBuilderWizardProps) {
  const [territories, setTerritories] = useState<TerritoryOption[]>([]);
  const [drafts, setDrafts] = useState<CampaignDraftRecord[]>([]);
  const [activeDraft, setActiveDraft] = useState<CampaignDraftRecord | null>(null);
  const [activeStep, setActiveStep] = useState<WizardStepId>('location');
  const [campaignGoal, setCampaignGoal] = useState('');
  const [loadingAction, setLoadingAction] = useState<LoadingAction>(null);
  const [approvalIssues, setApprovalIssues] = useState<Array<{ level: string; message: string }>>([]);
  const [validation, setValidation] = useState<CampaignValidationResult | null>(null);
  const [createResult, setCreateResult] = useState<{ resourceNames?: string[]; error?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const outputs = (activeDraft?.stepOutputs ?? {}) as Record<string, unknown>;

  const loadDrafts = useCallback(async () => {
    const res = await fetch('/api/admin/marketing/campaign-drafts');
    if (res.ok) {
      const data = await res.json();
      setDrafts(data.drafts ?? []);
    }
  }, []);

  const loadTerritories = useCallback(async () => {
    const res = await fetch('/api/admin/marketing/campaign-drafts/territories');
    if (res.ok) {
      const data = await res.json();
      setTerritories(data.territories ?? []);
    }
  }, []);

  useEffect(() => {
    loadDrafts();
    loadTerritories();
  }, [loadDrafts, loadTerritories]);

  const [locationData, setLocationData] = useState<LocationStepData | null>(null);
  const [audienceData, setAudienceData] = useState<AudienceStepData | null>(null);

  useEffect(() => {
    if (activeDraft) {
      setActiveStep((activeDraft.wizardStep as WizardStepId) || 'location');
      setCampaignGoal(activeDraft.naturalLanguagePrompt ?? '');
      setValidation(activeDraft.validationResult);
      const outs = activeDraft.stepOutputs as Record<string, unknown>;
      setLocationData((outs.location as LocationStepData) ?? null);
      setAudienceData((outs.audience as AudienceStepData) ?? null);
    }
  }, [activeDraft?.id, activeDraft?.updatedAt]);

  const selectedTerritory = useMemo(() => {
    const destId = locationData?.destinationId ?? (outputs.location as LocationStepData | undefined)?.destinationId;
    if (!destId) return null;
    return territories.find((t) => t.destinationId === destId) ?? null;
  }, [locationData, outputs.location, territories]);

  async function startNewDraft() {
    setError(null);
    setLoadingAction('create');
    try {
      const res = await fetch('/api/admin/marketing/campaign-drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignGoal }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to create draft');
      setActiveDraft(data.draft);
      setActiveStep('location');
      setApprovalIssues([]);
      setValidation(null);
      setCreateResult(null);
      await loadDrafts();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create draft');
    } finally {
      setLoadingAction(null);
    }
  }

  async function patchStep(step: WizardStepId, body: unknown) {
    if (!activeDraft) return;
    setLoadingAction('save');
    try {
      const res = await fetch(
        `/api/admin/marketing/campaign-drafts/${activeDraft.id}/steps/${step}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Save failed');
      setActiveDraft(data.draft);
    } finally {
      setLoadingAction(null);
    }
  }

  async function approveStep(step: WizardStepId, output: unknown, clearDownstream = false) {
    if (!activeDraft) return;
    setLoadingAction('approve');
    setApprovalIssues([]);
    try {
      const res = await fetch(
        `/api/admin/marketing/campaign-drafts/${activeDraft.id}/steps/${step}/approve`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ output, clearDownstream }),
        },
      );
      const data = await res.json();
      if (!res.ok) {
        setApprovalIssues(data.issues ?? [{ level: 'error', message: data.error }]);
        return;
      }
      setActiveDraft(data.draft);
      if (data.nextStep) setActiveStep(data.nextStep);
      setValidation(null);
      await loadDrafts();
    } finally {
      setLoadingAction(null);
    }
  }

  async function generateStep(step: WizardStepId) {
    if (!activeDraft) return;
    setLoadingAction('generate');
    try {
      const res = await fetch(
        `/api/admin/marketing/campaign-drafts/${activeDraft.id}/steps/${step}/generate`,
        { method: 'POST' },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Generation failed');
      setActiveDraft(data.draft);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generation failed');
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleValidate() {
    if (!activeDraft) return;
    setLoadingAction('validate');
    try {
      const res = await fetch(`/api/admin/marketing/campaign-drafts/${activeDraft.id}/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dryRun: true }),
      });
      const data = await res.json();
      setValidation(data.validation ?? null);
      if (data.draft) setActiveDraft(data.draft);
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleCreate(dryRun: boolean) {
    if (!activeDraft) return;
    setLoadingAction(dryRun ? 'create-dry' : 'create-live');
    setCreateResult(null);
    try {
      const res = await fetch(`/api/admin/marketing/campaign-drafts/${activeDraft.id}/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dryRun }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCreateResult({ error: data.error ?? 'Create failed' });
        if (data.validation) setValidation(data.validation);
        return;
      }
      setCreateResult({ resourceNames: data.resourceNames });
      if (data.draft) {
        setActiveDraft(data.draft);
        await loadDrafts();
      }
    } finally {
      setLoadingAction(null);
    }
  }

  function goBack() {
    const idx = stepIndex(activeStep);
    if (idx > 0) {
      const hasDownstreamApproved = WIZARD_STEP_ORDER.slice(idx).some((s) =>
        activeDraft ? isStepComplete(activeDraft, s) : false,
      );
      if (hasDownstreamApproved && !window.confirm('Going back may require re-approving later steps. Continue?')) {
        return;
      }
      setActiveStep(WIZARD_STEP_ORDER[idx - 1]!);
      setApprovalIssues([]);
    }
  }

  function getStepMeta(step: WizardStepId): { source?: string; aiAvailable: boolean } {
    const meta = (outputs[step] as { _meta?: { source?: string; aiAvailable?: boolean } })?._meta;
    return { source: meta?.source, aiAvailable: llmConfigured && (meta?.aiAvailable ?? llmConfigured) };
  }

  const loading = loadingAction !== null;
  const loc = outputs.location as LocationStepData | undefined;
  const aud = outputs.audience as {
    languageCode: 'en';
    landingUrl: string;
    occasion?: string;
  } | undefined;
  const adGroups = (outputs.ad_groups as { adGroups: Array<{ name: string }> } | undefined)?.adGroups ?? [];
  const keywords =
    (outputs.keywords as { adGroups: Array<{ name: string; keywords: Array<{ text: string; matchType: 'EXACT' | 'PHRASE' }> }> } | undefined)
      ?.adGroups ?? [];
  const negatives =
    (outputs.negative_keywords as { negativeKeywords: Array<{ text: string; matchType: 'PHRASE' }> } | undefined)
      ?.negativeKeywords ?? [];
  const adCopy = outputs.ad_copy as {
    adGroups: Array<{ name: string; headlines: string[]; descriptions: string[] }>;
    dailyBudgetThb: number;
  } | undefined;

  return (
    <div className={styles.root}>
      {!isOwner && (
        <div className={styles.ownerHint}>
          View-only — only owners can create campaigns in Google Ads.
        </div>
      )}

      {!googleAdsConfigured && (
        <div className={styles.errorBanner}>
          Google Ads is not configured. Set env vars and redeploy to create campaigns.
        </div>
      )}

      {error && <div className={styles.errorBanner}>{error}</div>}

      {loadingAction && (
        <div className={styles.loadingOverlay} role="status" aria-live="polite">
          <div className={styles.loadingCard}>
            <div className={styles.spinner} />
            <p>Working…</p>
          </div>
        </div>
      )}

      {!activeDraft ? (
        <section className={styles.card}>
          <h3 className={styles.sectionTitle}>New Search campaign</h3>
          <p className={styles.hint}>
            Step-by-step wizard for supported Thailand markets. Pick territory explicitly — no AI location guessing.
          </p>
          <label className={styles.questionLabel}>Campaign goal (optional)</label>
          <textarea
            className={styles.textarea}
            rows={3}
            value={campaignGoal}
            onChange={(e) => setCampaignGoal(e.target.value)}
            placeholder="e.g. Birthday flower delivery for hotel guests in Phuket"
          />
          <div className={styles.actions}>
            <button
              type="button"
              className="admin-btn admin-btn-primary btnFull"
              onClick={startNewDraft}
              disabled={!isOwner || loading}
            >
              Start wizard
            </button>
          </div>
        </section>
      ) : (
        <>
          <nav className="admin-product-create-stepper" aria-label="Campaign builder steps">
            {WIZARD_STEP_ORDER.map((step, index) => {
              const isActive = activeStep === step;
              const isComplete = isStepComplete(activeDraft, step);
              const canNavigate =
                index === 0 || isStepComplete(activeDraft, WIZARD_STEP_ORDER[index - 1]!);
              return (
                <button
                  key={step}
                  type="button"
                  className={`admin-product-create-stepper-item${isActive ? ' is-active' : ''}${
                    isComplete ? ' is-complete' : ''
                  }`}
                  onClick={() => canNavigate && setActiveStep(step)}
                  disabled={!canNavigate}
                >
                  <span className="admin-product-create-stepper-number">
                    {isComplete ? '✓' : index + 1}
                  </span>
                  <span className="admin-product-create-stepper-text">
                    <strong>{WIZARD_STEP_LABELS[step].label}</strong>
                    <small>{WIZARD_STEP_LABELS[step].eyebrow}</small>
                  </span>
                </button>
              );
            })}
          </nav>

          {activeStep === 'location' && (
            <LocationStep
              territories={territories}
              value={locationData}
              campaignGoal={campaignGoal}
              onChange={setLocationData}
              onGoalChange={setCampaignGoal}
              onApprove={async () => {
                if (!locationData) return;
                await patchStep('location', { ...locationData, campaignGoal });
                await approveStep('location', { ...locationData, campaignGoal });
              }}
              loading={loading}
              issues={approvalIssues}
            />
          )}

          {activeStep === 'audience' && selectedTerritory && (
            <AudienceStep
              value={
                audienceData ?? {
                  languageCode: 'en',
                  landingUrl: selectedTerritory.landingUrl,
                }
              }
              territoryName={selectedTerritory.territoryName}
              defaultLandingUrl={selectedTerritory.landingUrl}
              audienceNotes={selectedTerritory.audienceNotes}
              isExpansion={selectedTerritory.marketType !== 'home'}
              onChange={setAudienceData}
              onApprove={async () => {
                const data = audienceData ?? {
                  languageCode: 'en' as const,
                  landingUrl: selectedTerritory.landingUrl,
                };
                await patchStep('audience', data);
                await approveStep('audience', data);
              }}
              onBack={goBack}
              loading={loading}
              issues={approvalIssues}
            />
          )}

          {activeStep === 'ad_groups' && (
            <AdGroupsStep
              adGroups={adGroups}
              onChange={(groups) => patchStep('ad_groups', { adGroups: groups })}
              onGenerate={() => generateStep('ad_groups')}
              onApprove={() => approveStep('ad_groups', { adGroups })}
              onBack={goBack}
              loading={loading}
              generating={loadingAction === 'generate'}
              aiAvailable={llmConfigured}
              source={getStepMeta('ad_groups').source}
              issues={approvalIssues}
            />
          )}

          {activeStep === 'keywords' && (
            <KeywordsStep
              adGroups={keywords.length ? keywords : adGroups.map((g) => ({ ...g, keywords: [] }))}
              onChange={(groups) => patchStep('keywords', { adGroups: groups })}
              onGenerate={() => generateStep('keywords')}
              onApprove={() => approveStep('keywords', { adGroups: keywords })}
              onBack={goBack}
              loading={loading}
              generating={loadingAction === 'generate'}
              aiAvailable={llmConfigured}
              source={getStepMeta('keywords').source}
              issues={approvalIssues}
            />
          )}

          {activeStep === 'negative_keywords' && (
            <NegativeKeywordsStep
              negativeKeywords={negatives}
              onChange={(kws) => patchStep('negative_keywords', { negativeKeywords: kws })}
              onGenerate={() => generateStep('negative_keywords')}
              onApprove={() => approveStep('negative_keywords', { negativeKeywords: negatives })}
              onBack={goBack}
              loading={loading}
              generating={loadingAction === 'generate'}
              aiAvailable={llmConfigured}
              source={getStepMeta('negative_keywords').source}
              issues={approvalIssues}
            />
          )}

          {activeStep === 'ad_copy' && (locationData ?? loc) && (audienceData ?? aud) && (
            <AdCopyReviewCreateStep
              adGroups={
                adCopy?.adGroups ??
                adGroups.map((g) => ({
                  name: g.name,
                  headlines: ['', '', ''],
                  descriptions: ['', ''],
                }))
              }
              dailyBudgetThb={adCopy?.dailyBudgetThb ?? 500}
              campaignName={activeDraft.campaignDraft?.campaignName}
              territoryName={(locationData ?? loc)!.territoryName}
              locationTargetType={(locationData ?? loc)!.locationTargetType}
              landingUrl={(audienceData ?? aud)!.landingUrl}
              onChange={(groups) =>
                patchStep('ad_copy', { adGroups: groups, dailyBudgetThb: adCopy?.dailyBudgetThb ?? 500 })
              }
              onBudgetChange={(b) =>
                patchStep('ad_copy', {
                  adGroups: adCopy?.adGroups ?? [],
                  dailyBudgetThb: b,
                })
              }
              onGenerate={() => generateStep('ad_copy')}
              onApprove={() =>
                approveStep('ad_copy', {
                  adGroups: adCopy?.adGroups ?? [],
                  dailyBudgetThb: adCopy?.dailyBudgetThb ?? 500,
                })
              }
              onValidate={handleValidate}
              onCreateDryRun={() => handleCreate(true)}
              onCreate={() => handleCreate(false)}
              onBack={goBack}
              loading={loading}
              generating={loadingAction === 'generate'}
              aiAvailable={llmConfigured}
              source={getStepMeta('ad_copy').source}
              validation={validation}
              createResult={createResult ?? undefined}
              isOwner={isOwner}
              issues={approvalIssues}
            />
          )}
        </>
      )}

      <section className={styles.card}>
        <h3 className={styles.sectionTitle}>Recent drafts</h3>
        {drafts.length === 0 ? (
          <p className={styles.hint}>No drafts yet.</p>
        ) : (
          <ul className={styles.draftList}>
            {drafts.map((d) => (
              <li
                key={d.id}
                className={styles.draftItem}
                onClick={() => {
                  setActiveDraft(d);
                  setApprovalIssues([]);
                  setCreateResult(null);
                }}
              >
                <div className={styles.draftItemTitle}>{getDraftProgress(d)}</div>
                <div className={styles.draftItemMeta}>
                  {new Date(d.updatedAt).toLocaleString()} · {d.adminEmail}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
