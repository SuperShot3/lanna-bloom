import {
  HOMEPAGE_EXPERIMENT_COOKIE,
  HOMEPAGE_EXPERIMENT_NAME,
} from './config';
import { parseHomepageVariant } from './assignment';

function readDocumentCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  if (!match?.[1]) return undefined;
  try {
    return decodeURIComponent(match[1].trim());
  } catch {
    return match[1].trim();
  }
}

/**
 * Attach to existing dataLayer events (including purchase). Empty when unassigned.
 * Does not change ecommerce shape or fire extra purchase events.
 */
export function getHomepageExperimentAnalyticsParams(): {
  experiment_name?: string;
  experiment_variant?: string;
} {
  const variant = parseHomepageVariant(readDocumentCookie(HOMEPAGE_EXPERIMENT_COOKIE));
  if (!variant) return {};
  return {
    experiment_name: HOMEPAGE_EXPERIMENT_NAME,
    experiment_variant: variant,
  };
}
