import Link from 'next/link';
import { MarketingSettingsClient } from './MarketingSettingsClient';

export default function MarketingSettingsPage() {
  return (
    <div className="admin-accounting-info">
      <header className="admin-header admin-page-header">
        <div>
          <Link href="/admin/marketing" className="admin-back-link">
            ← Back to Marketing Insights
          </Link>
          <h1 className="admin-title">Marketing settings</h1>
          <p className="admin-hint">API integrations and environment variables for Marketing Insights.</p>
        </div>
      </header>

      <div className="admin-accounting-info-body">
        <MarketingSettingsClient />
      </div>
    </div>
  );
}
