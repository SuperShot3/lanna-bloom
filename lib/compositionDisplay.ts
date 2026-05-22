/** Split CMS composition text into one line per flower/item for display. */
export function getCompositionLines(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  if (/[,\n;]/.test(trimmed)) {
    return trimmed
      .split(/[,;\n]+/)
      .map((part) => part.trim())
      .filter(Boolean);
  }

  // e.g. "Red roses White lilies" without commas
  if (/[a-z]\s+[A-Z]/.test(trimmed)) {
    const parts = trimmed.split(/\s+(?=[A-Z])/).map((part) => part.trim()).filter(Boolean);
    if (parts.length > 1) return parts;
  }

  return [trimmed];
}

/** One-line composition for under the product title (comma-separated items). */
export function getCompositionSingleLine(text: string): string {
  const lines = getCompositionLines(text);
  if (lines.length === 0) return '';
  return lines.join(', ');
}
