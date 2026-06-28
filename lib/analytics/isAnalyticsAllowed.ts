/** True on the client under the notice-based analytics model. */
export function isAnalyticsAllowed(): boolean {
  return typeof window !== 'undefined';
}
