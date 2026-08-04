'use client';

import { Suspense } from 'react';
import { AdminShell } from '../components/AdminShell';
import { MissingCogsNotice, MissingCogsProvider } from '../components/MissingCogsNotice';

function AdminShellFallback() {
  return (
    <div className="admin-shell" style={{ minHeight: '100vh', padding: 24 }}>
      <p className="admin-hint">Loading admin…</p>
    </div>
  );
}

export function AdminDashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <MissingCogsProvider>
      <MissingCogsNotice />
      <Suspense fallback={<AdminShellFallback />}>
        <AdminShell>{children}</AdminShell>
      </Suspense>
    </MissingCogsProvider>
  );
}
