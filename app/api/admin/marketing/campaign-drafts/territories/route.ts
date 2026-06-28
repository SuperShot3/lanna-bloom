import { NextResponse } from 'next/server';
import { requireMarketingView } from '@/lib/marketing/adminApi';
import { listWizardTerritories } from '@/lib/marketing/campaignBuilder/wizard/territoryProfiles';
import { buildLandingUrl } from '@/lib/marketing/campaignBuilder/wizard/territoryProfiles';

export async function GET() {
  const auth = await requireMarketingView();
  if (!auth.ok) return auth.response;

  const territories = listWizardTerritories().map((p) => ({
    destinationId: p.destinationId,
    territoryName: p.territoryName,
    marketSlug: p.marketSlug,
    marketType: p.marketType,
    landingUrl: buildLandingUrl(p.landingUrlPath),
    audienceNotes: p.audienceNotes,
    sameDayAllowed: p.deliveryBusinessRules.sameDayAllowed,
  }));

  return NextResponse.json({ territories });
}
