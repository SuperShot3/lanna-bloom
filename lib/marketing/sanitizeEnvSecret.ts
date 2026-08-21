/** Strip wrapping quotes, BOM, and extra lines from env secrets. */
export function sanitizeEnvSecret(raw: string | undefined | null): string | undefined {
  if (raw == null) return undefined;
  let v = raw.replace(/^\uFEFF/, '').trim();
  if (
    (v.startsWith('"') && v.endsWith('"') && v.length >= 2) ||
    (v.startsWith("'") && v.endsWith("'") && v.length >= 2)
  ) {
    v = v.slice(1, -1).trim();
  }
  const firstLine = v.split(/\r?\n/, 1)[0]?.trim() ?? '';
  return firstLine || undefined;
}
