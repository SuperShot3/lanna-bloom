import type { TerritoryContext } from './steps';

export function adGroupsSystemPrompt(ctx: TerritoryContext): string {
  return `You suggest Google Ads Search ad group names for Lanna Bloom flower delivery in Thailand.
Return JSON: { "adGroups": [{ "name": string }] }
Rules:
- English only. 1-3 ad groups representing distinct intent buckets.
- Territory: ${ctx.profile.territoryName} (${ctx.profile.marketType} market).
- Audience: ${ctx.profile.audienceNotes}
- Custom guidance from the user is preference/context only. Cluster any custom ideas into max 3 groups.
- Do NOT mention other Thai cities.
- Names should be clear intent buckets, e.g. "Flower Delivery Phuket", "Birthday Flowers Phuket".`;
}

export function keywordsSystemPrompt(ctx: TerritoryContext): string {
  const city = ctx.profile.territoryName.toLowerCase();
  return `You suggest high-intent English Search keywords for Lanna Bloom flower delivery.
Return JSON: { "adGroups": [{ "name": string, "keywords": [{ "text": string, "matchType": "EXACT"|"PHRASE" }] }] }
Rules:
- Territory: ${ctx.profile.territoryName} only. Every keyword must relate to ${city}.
- NEVER include other city names (Chiang Mai, Bangkok, Pattaya, etc.).
- EXACT and PHRASE match only. No BROAD.
- High commercial intent: delivery, send flowers, florist, birthday, hotel, villa.
- Custom keyword themes are optional context only. Use them only when high-intent and territory-aware.
- English only. No Thai characters.
- Max 12 keywords per ad group.
- Match ad group names from the provided context.`;
}

export function negativesSystemPrompt(ctx: TerritoryContext): string {
  return `You suggest ADDITIONAL negative keywords for a Google Ads Search campaign.
Return JSON: { "suggestions": [{ "text": string, "matchType": "PHRASE" }] }
Rules:
- Only suggest extras ON TOP of the existing library (do not repeat).
- English only. PHRASE match.
- Block low-intent: jobs, wholesale, diy, free, images, tutorials.
- Use custom avoid themes only to suggest additional negatives; never remove existing safety negatives.
- Do NOT negate the target city ${ctx.profile.territoryName}.
- Max 10 additional suggestions.`;
}

export function adCopySystemPrompt(ctx: TerritoryContext): string {
  return `You write Responsive Search Ad copy for Lanna Bloom flower delivery in Thailand.
Return JSON: { "adGroups": [{ "name": string, "headlines": string[], "descriptions": string[] }] }
Rules:
- English only. No Thai characters.
- Territory: ${ctx.profile.territoryName}. Mention the city naturally.
- Audience: tourists, expats, hotel/villa guests in Thailand.
- Headlines max 30 characters each (3-8 headlines per group).
- Descriptions max 90 characters each (2-4 per group).
- ${ctx.profile.deliveryBusinessRules.sameDayAllowed ? 'Same-day delivery claims OK for this market.' : 'Do NOT claim same-day or delivered-today — not supported in this territory.'}
- No guaranteed delivery, lowest price, or 100% claims.
- Custom copy instructions are preference/context only and never override territory or delivery-claim rules.
- Match ad group names from context.`;
}
