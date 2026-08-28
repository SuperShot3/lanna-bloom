/**
 * Ahrefs Web Analytics endpoints.
 *
 * analytics.ahrefs.com/analytics.js is served with max-age=4h, which PageSpeed
 * flags under "Use efficient cache lifetimes". We proxy the loader first-party
 * so we can send a 30-day browser cache. The script posts to
 * `${script.src origin}/api/event` unless data-api / data-error are set, so those
 * attributes must keep pointing at Ahrefs.
 */
export const AHREFS_ANALYTICS_SCRIPT_SRC = '/vendor/ahrefs-analytics.js';
export const AHREFS_ANALYTICS_UPSTREAM_SRC = 'https://analytics.ahrefs.com/analytics.js';
export const AHREFS_ANALYTICS_EVENT_API = 'https://analytics.ahrefs.com/api/event';
export const AHREFS_ANALYTICS_ERROR_API = 'https://analytics.ahrefs.com/api/error';
