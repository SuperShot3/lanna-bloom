import 'server-only';

import OpenAI from 'openai';
import type { WeddingBouquetAnswers, WeddingBouquetResult } from './types';

const DEFAULT_MODEL = 'gpt-4o-mini';

function getModel(): string {
  return process.env.WEDDING_BOUQUET_DESIGNER_LLM_MODEL?.trim() || DEFAULT_MODEL;
}

function getOpenAiClient(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;
  return new OpenAI({ apiKey });
}

const SYSTEM_PROMPT = `You are a florist's assistant writing copy for a wedding bouquet quiz result page.
Given structured quiz answers (recipient, style, colors, dress color, size, venue, liked/disliked flowers, budget), return strict JSON:
{"description": string, "aiImagePrompt": string}
- "description": 2-3 warm, concrete sentences describing the bouquet in plain language a bride would understand. No flower Latin names unless commonly known.
- "aiImagePrompt": a single detailed prompt (English, 40-70 words) suitable for pasting into an AI image generator (e.g. ChatGPT image, Midjourney) to visualize this exact bouquet: subject, style, color palette, flowers, size, lighting, setting, photographic quality terms.
Respect any liked/disliked flowers given. Do not invent a budget-inappropriate design. Output JSON only, no markdown.`;

/**
 * Calls the LLM to turn validated quiz answers into a description + AI image prompt.
 * Returns null if no API key is configured or the call fails — caller falls back to templates.
 */
export async function generateWeddingBouquetCopy(
  answers: WeddingBouquetAnswers
): Promise<WeddingBouquetResult | null> {
  const client = getOpenAiClient();
  if (!client) return null;

  try {
    const completion = await client.chat.completions.create({
      model: getModel(),
      temperature: 0.5,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: JSON.stringify(answers) },
      ],
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) return null;

    const parsed = JSON.parse(content) as Partial<WeddingBouquetResult>;
    if (typeof parsed.description !== 'string' || typeof parsed.aiImagePrompt !== 'string') {
      return null;
    }
    return { description: parsed.description, aiImagePrompt: parsed.aiImagePrompt };
  } catch (err) {
    console.error('[weddingBouquetDesigner] LLM call failed', err);
    return null;
  }
}
