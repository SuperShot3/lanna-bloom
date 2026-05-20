/**
 * Best-effort Thai postcode extraction for storage / zone consistency checks.
 * Does not drive delivery pricing.
 */

const FIVE_DIGITS = /\b(\d{5})\b/g;

function allFiveDigitMatches(text: string): string[] {
  const out: string[] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(FIVE_DIGITS.source, 'g');
  while ((m = re.exec(text)) !== null) {
    out.push(m[1]);
  }
  return out;
}

/** Prefer last 5-digit group in string (common when full address lists multiple numbers). */
export function extractPreferredPostcodeFromText(text: string): string | null {
  const trimmed = text?.trim();
  if (!trimmed) return null;
  const matches = allFiveDigitMatches(trimmed);
  if (matches.length === 0) return null;
  return matches[matches.length - 1];
}

function extractFromGoogleMapsUrl(url: string): string | null {
  const raw = url.trim();
  if (!raw) return null;

  try {
    const u = new URL(raw);
    const q = u.searchParams.get('q');
    if (q) {
      const decoded = decodeURIComponent(q.replace(/\+/g, ' '));
      const fromQ = extractPreferredPostcodeFromText(decoded);
      if (fromQ) return fromQ;
    }
  } catch {
    // ignore invalid URL
  }

  return extractPreferredPostcodeFromText(raw);
}

export function inferPostalCodeFromDelivery(input: {
  address: string;
  deliveryPostalCode?: string | null;
  deliveryGoogleMapsUrl?: string | null;
}): string | null {
  const explicit = input.deliveryPostalCode?.trim();
  if (explicit && /^\d{5}$/.test(explicit)) return explicit;
  const fromAddress = extractPreferredPostcodeFromText(input.address ?? '');
  const fromUrl = input.deliveryGoogleMapsUrl
    ? extractFromGoogleMapsUrl(input.deliveryGoogleMapsUrl)
    : null;
  return fromAddress ?? fromUrl ?? null;
}
