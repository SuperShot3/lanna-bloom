export const MAX_AUTHOR_NAME_LENGTH = 200;
export const MAX_AUTHOR_EMAIL_LENGTH = 254;
export const MAX_BODY_LENGTH = 2000;
export const MAX_GUIDE_SLUG_LENGTH = 80;

export const GUIDE_SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const VISITOR_TOKEN_RE = /^[A-Za-z0-9_-]+$/;
export const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const COMMENT_ID_RE = UUID_RE;

export const HONEYPOT_FIELDS = ['company', 'website', 'url', 'phone_extra'] as const;

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type GuideCommentStatus = 'pending' | 'approved' | 'hidden';
