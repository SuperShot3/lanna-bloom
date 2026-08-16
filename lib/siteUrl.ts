/** Base URL for public links. Never returns localhost when running on Vercel. */

export function isLocalHostname(hostname: string): boolean {
  const host = hostname.replace(/^\[|\]$/g, '').toLowerCase();
  return host === 'localhost' || host === '127.0.0.1' || host === '::1' || host.endsWith('.localhost');
}

/** Upgrade http:// to https:// except localhost / loopback. */
export function upgradeToHttps(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'http:' && !isLocalHostname(parsed.hostname)) {
      parsed.protocol = 'https:';
      return parsed.toString();
    }
  } catch {
    /* keep original */
  }
  return url;
}

/**
 * Normalize a configured public origin: strip path/query, add https if missing,
 * and never emit http:// for a real hostname (link previews treat that as insecure).
 */
export function normalizePublicBaseUrl(raw: string | undefined | null): string | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;
  const candidate = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    if (isLocalHostname(parsed.hostname)) return parsed.origin;
    parsed.protocol = 'https:';
    return parsed.origin;
  } catch {
    return null;
  }
}

export function getBaseUrl(): string {
  const fromEnv = normalizePublicBaseUrl(process.env.NEXT_PUBLIC_APP_URL);
  if (fromEnv) {
    try {
      if (!isLocalHostname(new URL(fromEnv).hostname)) return fromEnv;
    } catch {
      return fromEnv;
    }
  }
  if (process.env.VERCEL) {
    const vercelHost = process.env.VERCEL_URL?.trim().replace(/^https?:\/\//i, '').replace(/\/$/, '');
    if (vercelHost) return `https://${vercelHost}`;
  }
  return fromEnv ?? 'http://localhost:3000';
}
