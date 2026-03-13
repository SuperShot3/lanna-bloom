import { Suspense } from 'react';
import { AdminLoginForm } from './AdminLoginForm';

export default function AdminLoginPage() {
  return (
    <div className="admin-login">
      <h1 className="admin-title">Admin</h1>
      <p className="admin-hint">Sign in with your email and password.</p>
      <Suspense fallback={<div className="admin-hint">Loading…</div>}>
        <AdminLoginForm />
      </Suspense>
    </div>
  );
}
