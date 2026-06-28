import { NextRequest, NextResponse } from 'next/server';
import { requireMarketingApply } from '@/lib/marketing/adminApi';
import { planFollowUpQuestions } from '@/lib/marketing/campaignBuilder/questionPlanner';

export async function POST(request: NextRequest) {
  const auth = await requireMarketingApply();
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const prompt = String(body?.prompt ?? '').trim();
    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required.' }, { status: 400 });
    }

    const answers = (body?.answers ?? {}) as Record<string, unknown>;
    const questions = planFollowUpQuestions({ prompt, answers });

    return NextResponse.json({ questions, hasMissingDetails: questions.length > 0 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to plan questions';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
