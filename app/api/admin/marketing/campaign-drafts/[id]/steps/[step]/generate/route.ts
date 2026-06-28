import { NextRequest, NextResponse } from 'next/server';
import { requireMarketingApply } from '@/lib/marketing/adminApi';
import { getCampaignDraftById, updateCampaignDraft } from '@/lib/marketing/campaignBuilder/store';
import { buildTerritoryContext } from '@/lib/marketing/campaignBuilder/wizard/buildTerritoryContext';
import { generateStepOutput } from '@/lib/marketing/campaignBuilder/wizard/generateStep';
import { isWizardStepId, type StepOutputs, type TerritoryContext } from '@/lib/marketing/campaignBuilder/wizard/steps';

interface RouteContext {
  params: Promise<{ id: string; step: string }>;
}

export async function POST(_request: NextRequest, context: RouteContext) {
  const auth = await requireMarketingApply();
  if (!auth.ok) return auth.response;

  const { id, step } = await context.params;
  if (!isWizardStepId(step)) {
    return NextResponse.json({ error: 'Invalid step' }, { status: 400 });
  }

  const record = await getCampaignDraftById(id);
  if (!record) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const priorOutputs = record.stepOutputs as StepOutputs;
  const loc = priorOutputs.location;
  if (!loc?.destinationId) {
    return NextResponse.json({ error: 'Approve location step first.' }, { status: 400 });
  }

  const ctx =
    (record.territoryContext as TerritoryContext | null) ??
    buildTerritoryContext(loc.destinationId);
  if (!ctx) {
    return NextResponse.json({ error: 'Territory context unavailable.' }, { status: 400 });
  }

  try {
    const result = await generateStepOutput(step, ctx, priorOutputs);

    const stepOutputs = {
      ...priorOutputs,
      [step]: {
        ...result.output,
        _meta: {
          source: result.source,
          aiAvailable: result.aiAvailable,
          llmUsage: result.llmUsage,
          generatedAt: new Date().toISOString(),
        },
      },
    };

    const updated = await updateCampaignDraft({
      id,
      stepOutputs,
    });

    return NextResponse.json({
      draft: updated,
      output: result.output,
      source: result.source,
      aiAvailable: result.aiAvailable,
      llmUsage: result.llmUsage,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Generation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
