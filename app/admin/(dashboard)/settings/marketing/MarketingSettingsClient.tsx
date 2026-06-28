'use client';

import { useEffect, useState } from 'react';
import type { MarketingConfigStatus } from '@/lib/marketing/types';
import { MarketingStatusBadge } from '../../marketing/MarketingStatusBadge';

const INTEGRATIONS: {
  key: keyof MarketingConfigStatus;
  name: string;
  powers: string;
  envVars: string;
  optional?: boolean;
}[] = [
  {
    key: 'googleAds',
    name: 'Google Ads API',
    powers: 'Ads tab, recommendations apply, Campaign Builder, Diagnostics reality grid',
    envVars: 'GOOGLE_ADS_DEVELOPER_TOKEN, GOOGLE_ADS_CLIENT_ID, GOOGLE_ADS_CLIENT_SECRET, GOOGLE_ADS_REFRESH_TOKEN, GOOGLE_ADS_CUSTOMER_ID, GOOGLE_ADS_LOGIN_CUSTOMER_ID (optional MCC)',
  },
  {
    key: 'ga4',
    name: 'GA4 Data API',
    powers: 'Diagnostics (default tab), Funnel tab, tracking health checks',
    envVars: 'GA4_PROPERTY_ID, GOOGLE_SERVICE_ACCOUNT_JSON (or GOOGLE_SERVICE_ACCOUNT_EMAIL + GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY)',
  },
  {
    key: 'llm',
    name: 'OpenAI',
    powers: 'Richer AI recommendations and Campaign Builder copy',
    envVars: 'OPENAI_API_KEY, MARKETING_LLM_MODEL (optional)',
    optional: true,
  },
  {
    key: 'supabase',
    name: 'Supabase',
    powers: 'Paid-order reality check, recommendations and campaign draft storage',
    envVars: 'SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY',
  },
];

export function MarketingSettingsClient() {
  const [config, setConfig] = useState<MarketingConfigStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/marketing/status')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.config) setConfig(data.config);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <section className="admin-accounting-info-section">
        <h2 className="admin-accounting-info-heading">Integrations</h2>
        <p className="admin-hint">Read-only status from server environment variables.</p>

        {loading && <p className="admin-hint">Loading status…</p>}

        {config && (
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table" style={{ width: '100%', fontSize: 14 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>Integration</th>
                  <th style={{ textAlign: 'left' }}>Powers</th>
                  <th style={{ textAlign: 'left' }}>Env vars</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {INTEGRATIONS.map((row) => (
                  <tr key={row.key}>
                    <td style={{ verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                      {row.name}
                      {row.optional && (
                        <span style={{ marginLeft: 6, fontSize: 12, color: '#64748b' }}>(optional)</span>
                      )}
                    </td>
                    <td style={{ verticalAlign: 'top', maxWidth: 280 }}>{row.powers}</td>
                    <td style={{ verticalAlign: 'top', maxWidth: 320, fontFamily: 'monospace', fontSize: 12 }}>
                      {row.envVars}
                    </td>
                    <td style={{ verticalAlign: 'top' }}>
                      <MarketingStatusBadge ok={config[row.key]} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="admin-accounting-info-section">
        <h2 className="admin-accounting-info-heading">Setup notes</h2>
        <ul style={{ margin: 0, paddingLeft: 20, lineHeight: 1.6 }}>
          <li>Set variables in your hosting provider (e.g. Vercel project settings → Environment Variables).</li>
          <li>Redeploy after changing env vars — the admin UI reads them at runtime on the server.</li>
          <li>
            See <code>.env.example</code> in the repo for variable names and comments.
          </li>
          <li>
            For GA4 and Google Ads API access, grant the service account / OAuth app the correct roles in Google
            Cloud and link Ads conversion tracking to GA4.
          </li>
        </ul>
      </section>
    </>
  );
}
