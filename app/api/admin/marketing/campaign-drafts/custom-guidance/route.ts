import { NextRequest, NextResponse } from 'next/server';
import { requireMarketingApply, requireMarketingView } from '@/lib/marketing/adminApi';
import {
  listCustomGuidanceLibrary,
  saveCustomGuidanceLibraryItem,
} from '@/lib/marketing/campaignBuilder/guidanceLibrary';
import {
  isCustomGuidanceCategory,
  normalizeCustomGuidanceText,
  validateCustomGuidanceFields,
} from '@/lib/marketing/campaignBuilder/wizard/customGuidance';

export async function GET() {
  const auth = await requireMarketingView();
  if (!auth.ok) return auth.response;

  const items = await listCustomGuidanceLibrary();
  return NextResponse.json({ items });
}

export async function POST(request: NextRequest) {
  const auth = await requireMarketingApply();
  if (!auth.ok) return auth.response;

  const adminEmail = auth.session.user.email ?? 'unknown';

  try {
    const body = (await request.json()) as { category?: string; label?: string };
    const category = body.category;
    if (!category || !isCustomGuidanceCategory(category)) {
      return NextResponse.json({ error: 'Invalid guidance category' }, { status: 400 });
    }

    const label = normalizeCustomGuidanceText(String(body.label ?? ''));
    const issues = validateCustomGuidanceFields(
      {
        customAudienceContexts: category === 'audience_contexts' ? [label] : [],
        customOccasions: category === 'occasions' ? [label] : [],
        customDeliveryContexts: category === 'delivery_contexts' ? [label] : [],
        customAdGroupIdeas: category === 'ad_group_ideas' ? [label] : [],
        customKeywordThemes: category === 'keyword_themes' ? [label] : [],
        customNegativeThemes: category === 'negative_themes' ? [label] : [],
        copyInstructions: category === 'copy_instructions' ? [label] : [],
        customNotes: category === 'market_notes' ? label : undefined,
      },
      null,
    );
    if (issues.some((issue) => issue.level === 'error')) {
      return NextResponse.json({ error: 'Invalid custom guidance', issues }, { status: 400 });
    }

    const item = await saveCustomGuidanceLibraryItem({
      item: { category, label },
      adminEmail,
    });
    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to save custom guidance';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
