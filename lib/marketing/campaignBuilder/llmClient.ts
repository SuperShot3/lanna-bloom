import 'server-only';

import OpenAI from 'openai';
import type { WizardStepId } from './wizard/steps';

export interface StepLlmConfig {
  model: string;
  reasoning: 'none' | 'low' | 'medium' | 'high';
  useResponsesApi: boolean;
  enabled: boolean;
}

const DEFAULT_STRUCTURE_MODEL = 'gpt-4o-mini';
const DEFAULT_COPY_MODEL = 'gpt-4o-mini';

export function getStepLlmConfig(stepId: WizardStepId): StepLlmConfig {
  const structureModel =
    process.env.MARKETING_CAMPAIGN_BUILDER_STRUCTURE_LLM_MODEL?.trim() || DEFAULT_STRUCTURE_MODEL;
  const copyModel =
    process.env.MARKETING_CAMPAIGN_BUILDER_COPY_LLM_MODEL?.trim() || DEFAULT_COPY_MODEL;
  const hasKey = Boolean(process.env.OPENAI_API_KEY?.trim());

  switch (stepId) {
    case 'location':
    case 'audience':
      return { model: '', reasoning: 'none', useResponsesApi: false, enabled: false };
    case 'ad_groups':
      return { model: structureModel, reasoning: 'low', useResponsesApi: false, enabled: hasKey };
    case 'keywords':
      return { model: copyModel, reasoning: 'medium', useResponsesApi: false, enabled: hasKey };
    case 'negative_keywords':
      return { model: structureModel, reasoning: 'none', useResponsesApi: false, enabled: hasKey };
    case 'ad_copy':
      return { model: copyModel, reasoning: 'high', useResponsesApi: false, enabled: hasKey };
    default:
      return { model: '', reasoning: 'none', useResponsesApi: false, enabled: false };
  }
}

export function getOpenAiClient(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;
  return new OpenAI({ apiKey });
}

export interface LlmUsage {
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
}

export async function callStructuredLlm<T>(input: {
  stepId: WizardStepId;
  system: string;
  user: string;
  schemaName: string;
}): Promise<{ data: T; usage: LlmUsage } | null> {
  const config = getStepLlmConfig(input.stepId);
  if (!config.enabled) return null;

  const client = getOpenAiClient();
  if (!client) return null;

  const completion = await client.chat.completions.create({
    model: config.model,
    temperature: 0.2,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: input.system },
      { role: 'user', content: input.user },
    ],
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) return null;

  const inputTokens = completion.usage?.prompt_tokens ?? 0;
  const outputTokens = completion.usage?.completion_tokens ?? 0;
  const estimatedCostUsd = (inputTokens * 0.15 + outputTokens * 0.6) / 1_000_000;

  try {
    return {
      data: JSON.parse(content) as T,
      usage: { inputTokens, outputTokens, estimatedCostUsd },
    };
  } catch {
    return null;
  }
}
