export const BALLOON_TEXT_MAX_LENGTH = 60;

export function normalizeBalloonText(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim().replace(/\s+/g, ' ');
  return normalized ? normalized.slice(0, BALLOON_TEXT_MAX_LENGTH) : undefined;
}
