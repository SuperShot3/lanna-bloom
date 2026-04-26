import { escapeHtml } from './escape';

const VAR_RE = /\{\{([a-zA-Z0-9_]+)\}\}/g;

const TRUSTED_HTML_PLACEHOLDERS = new Set([
  'social_footer',
  'brand_header',
  'product_showcase',
]);

function uniquePlaceholderKeys(templates: string): Set<string> {
  const keys = new Set<string>();
  let m: RegExpExecArray | null;
  const re = new RegExp(VAR_RE.source, 'g');
  while ((m = re.exec(templates)) !== null) {
    if (m[1]) keys.add(m[1]);
  }
  return keys;
}

function substitute(
  template: string,
  values: Readonly<Record<string, string>>
): string {
  return template.replace(VAR_RE, (_full, key: string) => values[key] ?? '');
}

export type RenderTemplateResult = {
  html: string;
  text: string;
  subject: string;
  /** Placeholders that were empty or undefined (for admin warning). */
  missingVariables: string[];
};

/**
 * Renders `{{var}}` placeholders. Most values are HTML-escaped; `social_footer` is passed through
 * (trusted, built server-side).
 */
export function renderTemplate(
  subjectTemplate: string,
  htmlTemplate: string,
  textTemplate: string | null | undefined,
  rawValues: Readonly<Record<string, string | undefined | null>>
): RenderTemplateResult {
  const allText = [subjectTemplate, htmlTemplate, textTemplate ?? ''].join('\n');
  const keys = uniquePlaceholderKeys(allText);
  const values: Record<string, string> = {};
  const missing: string[] = [];

  for (const k of Array.from(keys)) {
    const v = rawValues[k];
    const empty = v === undefined || v === null || String(v).trim() === '';
    if (empty) {
      missing.push(k);
      values[k] = '';
    } else if (TRUSTED_HTML_PLACEHOLDERS.has(k)) {
      values[k] = String(v);
    } else {
      values[k] = escapeHtml(String(v));
    }
  }

  return {
    subject: substitute(subjectTemplate, values).trim(),
    html: substitute(htmlTemplate, values).trim(),
    text: substitute(textTemplate ?? '', values).trim(),
    missingVariables: Array.from(new Set(missing)).sort(),
  };
}
