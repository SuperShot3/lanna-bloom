'use client';

import { Suspense } from 'react';
import { AdminShell } from '../components/AdminShell';

function AdminShellFallback() {
  return (
    <div className="admin-shell" style={{ minHeight: '100vh', padding: 24 }}>
      <p className="admin-hint">Loading admin…</p>
    </div>
  );
}

export function AdminDashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<AdminShellFallback />}>
      <AdminShell>{children}</AdminShell>
    </Suspense>
  );
}
