import Link from 'next/link';
import { CollectionSettingsClient } from './CollectionSettingsClient';
import { IntegrationsSettings } from './IntegrationsSettings';
import { MarketingKnowledgeBase } from './MarketingKnowledgeBase';

export default function SettingsPage() {
  return (
    <div className="admin-accounting-info">
      <header className="admin-header admin-page-header">
        <div>
          <Link href="/admin/orders" className="admin-back-link">
            ← Back to admin
          </Link>
          <h1 className="admin-title">Settings</h1>
          <p className="admin-hint">Integrations, guides, and one-time setup.</p>
        </div>
      </header>

      <div className="admin-accounting-info-body">
        <IntegrationsSettings />
        <MarketingKnowledgeBase />
        <CollectionSettingsClient />
      </div>
    </div>
  );
}

