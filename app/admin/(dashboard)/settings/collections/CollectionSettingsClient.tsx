'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function CollectionSettingsClient() {
  const router = useRouter();
  const [backfilling, setBackfilling] = useState(false);
  const [backfillResult, setBackfillResult] = useState<string | null>(null);

  const runBackfill = async (dryRun: boolean) => {
    setBackfilling(true);
    setBackfillResult(null);
    try {
      const res = await fetch('/api/admin/accounting/backfill-income', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dryRun }),
      });
      const data = await res.json();
      if (!res.ok) {
        setBackfillResult(`Error: ${data.error ?? 'Unknown error'}`);
      } else if (dryRun) {
        setBackfillResult(
          `Dry run: Would create ${data.wouldCreate} records, skip ${data.wouldSkip} already existing (out of ${data.total} paid orders)`
        );
      } else {
        setBackfillResult(data.message ?? `Created: ${data.created}, Skipped: ${data.skipped}`);
        setTimeout(() => router.refresh(), 1500);
      }
    } catch {
      setBackfillResult('Network error. Please try again.');
    } finally {
      setBackfilling(false);
    }
  };

  return (
    <section className="admin-accounting-info-section">
      <h2 className="admin-accounting-info-heading">Historical Backfill</h2>
      <p className="admin-hint">Advanced — one-time setup</p>
      <p>
        Run once to create income records for paid orders that existed before the accounting system was
        added. The operation is idempotent — already-linked orders are skipped automatically.
      </p>

      <div className="admin-accounting-backfill-actions">
        <button
          type="button"
          className="admin-btn admin-btn-outline admin-btn-sm"
          onClick={() => runBackfill(true)}
          disabled={backfilling}
        >
          {backfilling ? 'Checking…' : 'Dry Run (preview only)'}
        </button>
        <button
          type="button"
          className="admin-btn admin-btn-primary admin-btn-sm"
          onClick={() => runBackfill(false)}
          disabled={backfilling}
        >
          {backfilling ? 'Running…' : 'Run Backfill'}
        </button>
      </div>

      {backfillResult && <p className="admin-accounting-backfill-result">{backfillResult}</p>}
    </section>
  );
}

