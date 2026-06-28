import { NextRequest, NextResponse } from 'next/server';
import { requireMarketingApply } from '@/lib/marketing/adminApi';
import { generateSearchCampaignDraft } from '@/lib/marketing/campaignBuilder/generateDraft';
import { planFollowUpQuestions } from '@/lib/marketing/campaignBuilder/questionPlanner';
import { insertCampaignDraft } from '@/lib/marketing/campaignBuilder/store';
import { isGoogleAdsConfigured, isLlmConfigured } from '@/lib/marketing/config';

export async function POST(request: NextRequest) {
  const auth = await requireMarketingApply();
  if (!auth.ok) return auth.response;

  if (!isGoogleAdsConfigured()) {
    return NextResponse.json(
      { error: 'Google Ads is not configured.', hint: 'Set GOOGLE_ADS_* env vars.' },
      { status: 503 },
    );
  }

  try {
    const body = await request.json();
    const prompt = String(body?.prompt ?? '').trim();
    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required.' }, { status: 400 });
    }

    const answers = (body?.answers ?? {}) as Record<string, unknown>;
    const forceGenerate = Boolean(body?.forceGenerate);

    const pendingQuestions = planFollowUpQuestions({ prompt, answers });
    if (pendingQuestions.length > 0 && !forceGenerate) {
      return NextResponse.json(
        {
          error: 'Missing required details.',
          questions: pendingQuestions,
          hasMissingDetails: true,
        },
        { status: 400 },
      );
    }

    const useLlm = body?.useLlm !== false && isLlmConfigured();
    const { brief, draft, llmUsed } = await generateSearchCampaignDraft({
      prompt,
      answers,
      useLlm,
    });

    const adminEmail = auth.session.user.email ?? 'unknown';
    const record = await insertCampaignDraft({
      adminEmail,
      naturalLanguagePrompt: prompt,
      questionAnswers: answers,
      structuredBrief: brief,
      campaignDraft: draft,
    });

    return NextResponse.json({ draft: record, llmUsed });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Generation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
