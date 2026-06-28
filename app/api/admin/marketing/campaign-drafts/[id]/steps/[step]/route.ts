import { NextRequest, NextResponse } from 'next/server';
import { requireMarketingApply } from '@/lib/marketing/adminApi';
import { getCampaignDraftById, updateCampaignDraft } from '@/lib/marketing/campaignBuilder/store';
import { sanitizeGuidanceFields } from '@/lib/marketing/campaignBuilder/wizard/customGuidance';
import { isWizardStepId, type StepOutputs } from '@/lib/marketing/campaignBuilder/wizard/steps';

interface RouteContext {
  params: Promise<{ id: string; step: string }>;
}

export async function PATCH(request: NextRequest, context: RouteContext) {
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

  try {
    const body = sanitizeGuidanceFields(await request.json());
    const priorOutputs = record.stepOutputs as StepOutputs;
    const existingMeta = (priorOutputs[step] as Record<string, unknown> | undefined)?._meta;

    const stepOutputs = {
      ...priorOutputs,
      [step]: {
        ...body,
        ...(existingMeta ? { _meta: existingMeta } : {}),
      },
    };

    const updated = await updateCampaignDraft({
      id,
      stepOutputs,
      status: 'draft',
      validationResult: null,
    });

    return NextResponse.json({ draft: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid step data';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
