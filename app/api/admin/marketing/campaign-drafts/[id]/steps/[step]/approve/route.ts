import { NextRequest, NextResponse } from 'next/server';
import { requireMarketingApply } from '@/lib/marketing/adminApi';
import {
  getCampaignDraftById,
  insertCampaignBuilderAudit,
  updateCampaignDraft,
} from '@/lib/marketing/campaignBuilder/store';
import { approveWizardStep } from '@/lib/marketing/campaignBuilder/wizard/approveStep';
import { sanitizeGuidanceFields } from '@/lib/marketing/campaignBuilder/wizard/customGuidance';
import { isWizardStepId, type StepApprovals, type StepOutputs } from '@/lib/marketing/campaignBuilder/wizard/steps';

interface RouteContext {
  params: Promise<{ id: string; step: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  const auth = await requireMarketingApply();
  if (!auth.ok) return auth.response;

  const { id, step } = await context.params;
  if (!isWizardStepId(step)) {
    return NextResponse.json({ error: 'Invalid step' }, { status: 400 });
  }

  const record = await getCampaignDraftById(id);
  if (!record) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (record.status === 'created') {
    return NextResponse.json({ error: 'Created campaigns cannot be edited.' }, { status: 400 });
  }

  const adminEmail = auth.session.user.email ?? 'unknown';

  let body: { output?: unknown; clearDownstream?: boolean } = {};
  try {
    body = await request.json();
  } catch {
    /* use stored output */
  }

  const priorOutputs = record.stepOutputs as StepOutputs;
  const stepOutput = body.output ? sanitizeGuidanceFields(body.output as Record<string, unknown>) : priorOutputs[step];
  if (!stepOutput) {
    return NextResponse.json({ error: 'No step output to approve.' }, { status: 400 });
  }

  const result = approveWizardStep({
    stepId: step,
    stepOutput,
    priorOutputs,
    priorApprovals: record.stepApprovals as StepApprovals,
    adminEmail,
    clearDownstream: body.clearDownstream,
  });

  if (!result.ok) {
    return NextResponse.json({ error: 'Validation failed.', issues: result.issues }, { status: 400 });
  }

  const patch: Parameters<typeof updateCampaignDraft>[0] = {
    id,
    stepOutputs: result.stepOutputs,
    stepApprovals: result.stepApprovals,
    wizardStep: result.nextStep ?? step,
    status: step === 'ad_copy' ? 'approved' : 'draft',
    validationResult: null,
  };

  if (result.territoryContext) {
    patch.territoryContext = result.territoryContext as unknown as Record<string, unknown>;
  }

  if (result.structuredBrief) patch.structuredBrief = result.structuredBrief;
  if (result.campaignDraft) patch.campaignDraft = result.campaignDraft;

  if (step === 'location' && body.output && typeof body.output === 'object') {
    const note = (body.output as { customNotes?: string }).customNotes;
    if (note !== undefined) {
      patch.naturalLanguagePrompt = note;
    }
  }

  const updated = await updateCampaignDraft(patch);

  await insertCampaignBuilderAudit({
    draftId: id,
    adminEmail,
    action: `approve_step_${step}`,
    requestJson: { step },
    responseJson: { nextStep: result.nextStep },
  });

  return NextResponse.json({
    draft: updated,
    nextStep: result.nextStep,
    issues: result.issues,
  });
}
