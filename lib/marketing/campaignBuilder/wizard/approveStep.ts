import 'server-only';

import type { DeliveryDestinationId } from '@/lib/delivery/markets';
import { buildTerritoryContext } from './buildTerritoryContext';
import { mergeWizardToDraft } from './generateStep';
import {
  clearDownstreamApprovals,
  clearDownstreamOutputs,
  getNextStep,
  isStepApproved,
  type StepApprovals,
  type StepOutputs,
  type TerritoryContext,
  type WizardStepId,
} from './steps';
import { stepValidationOk, validateStepOutput } from './validators';
import type { CampaignBrief, SearchCampaignDraft, ValidationIssue } from '../types';

export interface ApproveStepResult {
  ok: boolean;
  issues: ValidationIssue[];
  nextStep: WizardStepId | null;
  stepOutputs: StepOutputs;
  stepApprovals: StepApprovals;
  territoryContext: TerritoryContext | null;
  structuredBrief?: CampaignBrief;
  campaignDraft?: SearchCampaignDraft;
}

export function approveWizardStep(input: {
  stepId: WizardStepId;
  stepOutput: unknown;
  priorOutputs: StepOutputs;
  priorApprovals: StepApprovals;
  adminEmail: string;
  clearDownstream?: boolean;
}): ApproveStepResult {
  let stepOutputs = { ...input.priorOutputs, [input.stepId]: input.stepOutput } as StepOutputs;
  let stepApprovals = { ...input.priorApprovals };
  let territoryContext: TerritoryContext | null = null;

  if (input.stepId === 'location') {
    const loc = input.stepOutput as {
      destinationId: DeliveryDestinationId;
    };
    territoryContext = buildTerritoryContext(loc.destinationId);
  } else if (input.priorOutputs.location) {
    territoryContext = buildTerritoryContext(
      (input.priorOutputs.location as { destinationId: DeliveryDestinationId }).destinationId,
    );
  }

  const issues = validateStepOutput(input.stepId, input.stepOutput, territoryContext);
  if (!stepValidationOk(issues)) {
    return {
      ok: false,
      issues,
      nextStep: null,
      stepOutputs,
      stepApprovals,
      territoryContext,
    };
  }

  if (input.clearDownstream) {
    stepApprovals = clearDownstreamApprovals(stepApprovals, input.stepId);
    stepOutputs = clearDownstreamOutputs(stepOutputs, input.stepId);
  }
  stepOutputs = { ...stepOutputs, [input.stepId]: input.stepOutput as StepOutputs[typeof input.stepId] };

  stepApprovals[input.stepId] = {
    approvedAt: new Date().toISOString(),
    approvedBy: input.adminEmail,
  };

  const nextStep = getNextStep(input.stepId);

  let structuredBrief: CampaignBrief | undefined;
  let campaignDraft: SearchCampaignDraft | undefined;

  if (input.stepId === 'ad_copy' && territoryContext) {
    const allApproved = ['location', 'audience', 'ad_groups', 'keywords', 'negative_keywords', 'ad_copy'].every(
      (s) => isStepApproved(stepApprovals, s as WizardStepId),
    );
    if (allApproved) {
      const merged = mergeWizardToDraft({ outputs: stepOutputs, ctx: territoryContext });
      structuredBrief = merged.brief;
      campaignDraft = merged.draft;
    }
  }

  return {
    ok: true,
    issues,
    nextStep,
    stepOutputs,
    stepApprovals,
    territoryContext,
    structuredBrief,
    campaignDraft,
  };
}
