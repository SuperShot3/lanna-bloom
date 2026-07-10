import { isValidLocale, type Locale } from '@/lib/i18n';
import { isCommentableGuideSlug } from './allowlist';
import {
  EMAIL_REGEX,
  MAX_AUTHOR_EMAIL_LENGTH,
  MAX_AUTHOR_NAME_LENGTH,
  MAX_BODY_LENGTH,
  UUID_RE,
  VISITOR_TOKEN_RE,
} from './constants';

export type ValidatedCommentInput = {
  guideSlug: string;
  authorName: string;
  authorEmail: string | null;
  body: string;
  locale: Locale;
  visitorToken: string;
  visitorTokenHash: string;
};

export type ValidationResult =
  | { ok: true; data: ValidatedCommentInput }
  | { ok: false; message: string };

function stripControlChars(value: string): string {
  return value.replace(/\0/g, '').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}

export function normalizeVisitorToken(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const token = raw.trim();
  if (token.length < 8 || token.length > 128) return null;
  if (UUID_RE.test(token)) return token;
  if (!VISITOR_TOKEN_RE.test(token)) return null;
  return token;
}

export function validateCommentInput(input: {
  guideSlug?: string;
  authorName?: string;
  authorEmail?: string;
  body?: string;
  locale?: string;
  visitorToken?: string;
  visitorTokenHash: (token: string) => string;
}): ValidationResult {
  const guideSlugRaw = typeof input.guideSlug === 'string' ? input.guideSlug.trim().toLowerCase() : '';
  if (!isCommentableGuideSlug(guideSlugRaw)) {
    return { ok: false, message: 'Guide not found' };
  }

  const authorName = stripControlChars(
    typeof input.authorName === 'string' ? input.authorName.trim() : ''
  );
  if (!authorName) {
    return { ok: false, message: 'Name is required' };
  }
  if (authorName.length > MAX_AUTHOR_NAME_LENGTH) {
    return { ok: false, message: `Name must be at most ${MAX_AUTHOR_NAME_LENGTH} characters` };
  }

  let authorEmail: string | null = null;
  if (typeof input.authorEmail === 'string' && input.authorEmail.trim()) {
    const email = input.authorEmail.trim().toLowerCase();
    if (email.length > MAX_AUTHOR_EMAIL_LENGTH) {
      return { ok: false, message: 'Email is too long' };
    }
    if (!EMAIL_REGEX.test(email)) {
      return { ok: false, message: 'Please enter a valid email address' };
    }
    authorEmail = email;
  }

  const body = stripControlChars(typeof input.body === 'string' ? input.body.trim() : '');
  if (!body) {
    return { ok: false, message: 'Comment is required' };
  }
  if (body.length > MAX_BODY_LENGTH) {
    return { ok: false, message: `Comment must be at most ${MAX_BODY_LENGTH} characters` };
  }

  const localeRaw = typeof input.locale === 'string' ? input.locale : 'en';
  const locale: Locale = isValidLocale(localeRaw) ? localeRaw : 'en';

  const visitorToken = normalizeVisitorToken(input.visitorToken);
  if (!visitorToken) {
    return { ok: false, message: 'Invalid request' };
  }

  return {
    ok: true,
    data: {
      guideSlug: guideSlugRaw,
      authorName,
      authorEmail,
      body,
      locale,
      visitorToken,
      visitorTokenHash: input.visitorTokenHash(visitorToken),
    },
  };
}

export function validateCommentId(raw: string | null | undefined): string | null {
  const id = raw?.trim() ?? '';
  if (!id || !UUID_RE.test(id)) return null;
  return id;
}

export function validateAdminStatus(raw: unknown): 'approved' | 'hidden' | null {
  if (raw === 'approved' || raw === 'hidden') return raw;
  return null;
}
