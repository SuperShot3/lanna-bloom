import Image from 'next/image';
import { Suspense } from 'react';
import { BRAND_LOGO_SRC } from '@/lib/brandLogo';
import { AdminLoginForm } from './AdminLoginForm';

export default function AdminLoginPage() {
  return (
    <div className="admin-login">
      <div className="admin-login-brand">
        <Image
          src={BRAND_LOGO_SRC}
          alt="Lanna Bloom logo"
          width={48}
          height={48}
          className="admin-login-brand-logo"
          priority
        />
        <div className="admin-login-brand-text">
          <span className="admin-login-brand-name">Lanna Bloom</span>
          <span className="admin-login-brand-sub">Admin</span>
        </div>
      </div>
      <p className="admin-hint">Sign in with your email and password.</p>
      <Suspense fallback={<div className="admin-hint">Loading…</div>}>
        <AdminLoginForm />
      </Suspense>
    </div>
  );
}
