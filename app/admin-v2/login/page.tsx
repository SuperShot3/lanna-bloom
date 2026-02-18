import { Suspense } from 'react';
import { AdminLoginForm } from './AdminLoginForm';

export default function AdminV2LoginPage() {
  return (
    <div className="admin-v2-login">
      <h1 className="admin-v2-title">Admin Dashboard v2</h1>
      <p className="admin-v2-hint">Sign in with your email and password.</p>
      <Suspense fallback={<div className="admin-v2-hint">Loading…</div>}>
        <AdminLoginForm />
      </Suspense>
    </div>
  );
}
