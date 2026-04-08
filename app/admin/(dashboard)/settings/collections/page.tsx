import Link from 'next/link';
import { CollectionSettingsClient } from './CollectionSettingsClient';

export default function CollectionSettingsPage() {
  return (
    <div className="admin-accounting-info">
      <header className="admin-header admin-page-header">
        <div>
          <Link href="/admin/accounting" className="admin-back-link">
            ← Back to dashboard
          </Link>
          <h1 className="admin-title">Collection settings</h1>
          <p className="admin-hint">Advanced tools and one-time setup for administrators.</p>
        </div>
      </header>

      <div className="admin-accounting-info-body">
        <CollectionSettingsClient />
      </div>
    </div>
  );
}

