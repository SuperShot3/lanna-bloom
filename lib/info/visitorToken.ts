'use client';

const VISITOR_TOKEN_KEY = 'lanna-bloom-guide-visitor-token';

function createToken(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

export function getOrCreateVisitorToken(): string {
  if (typeof window === 'undefined') return '';
  try {
    const existing = sessionStorage.getItem(VISITOR_TOKEN_KEY);
    if (existing && existing.length >= 8) return existing;
    const token = createToken();
    sessionStorage.setItem(VISITOR_TOKEN_KEY, token);
    return token;
  } catch {
    return createToken();
  }
}
