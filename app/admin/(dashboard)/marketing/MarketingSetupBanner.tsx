import Link from 'next/link';
import styles from './MarketingDiagnostics.module.css';

const MESSAGES = {
  ga4: "GA4 isn't connected — diagnostics need the Data API.",
  googleAds: "Google Ads isn't connected.",
} as const;

export type SetupBannerIntegration = keyof typeof MESSAGES;

export function MarketingSetupBanner({ integration }: { integration: SetupBannerIntegration }) {
  return (
    <div className={styles.setupBanner} role="status">
      <p className={styles.setupBannerText}>{MESSAGES[integration]}</p>
      <Link href="/admin/settings/marketing" className={styles.setupBannerLink}>
        Open marketing settings →
      </Link>
    </div>
  );
}
