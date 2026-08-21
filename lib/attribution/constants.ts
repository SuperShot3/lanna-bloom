export const ATTRIBUTION_WINDOW_DAYS = 90;
export const ATTRIBUTION_WINDOW_MS = ATTRIBUTION_WINDOW_DAYS * 24 * 60 * 60 * 1000;
export const ATTRIBUTION_COOKIE_MAX_AGE_SEC = ATTRIBUTION_WINDOW_DAYS * 24 * 60 * 60;

export const VISITOR_COOKIE = 'lanna_vid';
export const ATTR_COOKIE = 'lanna_attr';

/** Legacy JS-writable click-id cookies (client fallback; not HttpOnly). */
export const AD_CLICK_COOKIE_GCLID = 'lanna_ad_gclid';
export const AD_CLICK_COOKIE_GBRAID = 'lanna_ad_gbraid';
export const AD_CLICK_COOKIE_WBRAID = 'lanna_ad_wbraid';
export const AD_CLICK_STORAGE_KEY = 'lanna_ad_click_ids';
export const ATTR_PARAMS_STORAGE_KEY = 'lanna_attr_params';

export const ATTRIBUTION_QUERY_KEYS = [
  'gclid',
  'gbraid',
  'wbraid',
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  'campaignid',
  'adgroupid',
  'keyword',
  'device',
  'network',
  'matchtype',
  'gad_source',
  'gad_campaignid',
] as const;

export const CLICK_ID_MAX_LEN = 256;
export const UTM_MAX_LEN = 200;
export const LANDING_MAX_LEN = 300;
export const VISITOR_ID_MAX_LEN = 64;
