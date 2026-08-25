/**
 * Homepage A/B experiment: HomepageV1 vs HomepageV2.
 *
 * GTM: register Data Layer variables `experiment_name` and `experiment_variant`
 * (also readable from first-party cookie `lanna_hp_exp`) as GA4 event params /
 * custom dimensions. Do not add a second purchase tag.
 *
 * Kill switch without code change: HOMEPAGE_EXPERIMENT_ENABLED=false
 * (everyone sees V1; middleware stops rewriting to V2).
 */
export const HOMEPAGE_EXPERIMENT_NAME = 'homepage_2026_v2';
export const HOMEPAGE_EXPERIMENT_COOKIE = 'lanna_hp_exp';
export const HOMEPAGE_EXPERIMENT_MAX_AGE_SEC = 60 * 24 * 60 * 60;
export const HOMEPAGE_EXPERIMENT_LOCALE = 'en';
export const HOMEPAGE_V2_PATH_SEGMENT = 'homepage-v2';
export const HOMEPAGE_PREVIEW_QUERY = 'homepage';

export type HomepageVariant = 'v1' | 'v2';

/**
 * Code-level weights. `enabled: false` or v2Weight 0 → 100% V1.
 * Env HOMEPAGE_EXPERIMENT_ENABLED=false overrides enabled to false.
 */
export const HOMEPAGE_EXPERIMENT = {
  enabled: true,
  v1Weight: 50,
  v2Weight: 50,
} as const;

export function isHomepageExperimentEnabled(): boolean {
  const env = process.env.HOMEPAGE_EXPERIMENT_ENABLED;
  if (env === 'false' || env === '0') return false;
  return HOMEPAGE_EXPERIMENT.enabled;
}

export function getHomepageExperimentWeights(): { v1Weight: number; v2Weight: number } {
  return {
    v1Weight: HOMEPAGE_EXPERIMENT.v1Weight,
    v2Weight: HOMEPAGE_EXPERIMENT.v2Weight,
  };
}

export function homepageExperimentCookieOptions(maxAgeSec: number = HOMEPAGE_EXPERIMENT_MAX_AGE_SEC): {
  httpOnly: false;
  secure: boolean;
  sameSite: 'lax';
  path: '/';
  maxAge: number;
} {
  return {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: maxAgeSec,
  };
}
