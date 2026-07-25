/** Base URL for public links. Never returns localhost when running on Vercel. */
export function getBaseUrl(): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  const isLocalhost = (url: string) =>
    /^https?:\/\/localhost(\d*)(\s|$|\/)/i.test(url) || /^https?:\/\/127\.0\.0\.1/i.test(url);
  if (appUrl && !isLocalhost(appUrl)) return appUrl.replace(/\/$/, '');
  if (process.env.VERCEL && process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return 'http://localhost:3000';
}
