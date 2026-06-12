/**
 * Safe i18n lookup — never returns a raw key string to the UI.
 */
export function resolveTranslation(
  dict: Record<string, string | undefined>,
  key: string,
  ...fallbackDicts: Record<string, string | undefined>[]
): string {
  const primary = dict[key];
  if (primary != null && primary !== '') return primary;

  for (const fallback of fallbackDicts) {
    const value = fallback[key];
    if (value != null && value !== '') return value;
  }

  return '';
}
