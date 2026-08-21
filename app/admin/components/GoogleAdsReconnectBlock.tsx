'use client';

import { useSession } from 'next-auth/react';

export function GoogleAdsReconnectBlock({
  returnTo,
  redirectUri,
  hint,
}: {
  returnTo: 'marketing' | 'settings';
  redirectUri?: string;
  hint?: string;
}) {
  const { data: session } = useSession();
  const isOwner = (session?.user as { role?: string } | undefined)?.role === 'OWNER';

  return (
    <div style={{ marginTop: 12 }}>
      {hint && (
        <p className="admin-hint" style={{ marginTop: 0 }}>
          {hint}
        </p>
      )}
      {isOwner ? (
        <a
          className="admin-btn admin-btn-primary"
          href={`/api/admin/marketing/google-ads/oauth/start?returnTo=${returnTo}`}
        >
          Reconnect Google Ads
        </a>
      ) : (
        <p className="admin-hint">Ask an owner to reconnect Google Ads.</p>
      )}
      {redirectUri && (
        <p className="admin-hint" style={{ marginTop: 12 }}>
          Before reconnecting, add this exact redirect URI to the Google Cloud OAuth client (Web
          application):
          <br />
          <code>{redirectUri}</code>
        </p>
      )}
      <p className="admin-hint">
        If the OAuth consent screen is still in <strong>Testing</strong>, Google expires the token every 7
        days. Set it to <strong>In production</strong> after reconnecting so this does not happen again.
      </p>
      <p className="admin-hint">
        Reconnect also requests Data Manager access so paid Google-ad orders can be imported into the
        existing website purchase conversion. Enable the Data Manager API on the same Google Cloud project
        first.
      </p>
    </div>
  );
}
