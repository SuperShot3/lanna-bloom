'use client';

import { usePathname } from 'next/navigation';
import { AdminShell } from './AdminShell';

export function AdminLayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === '/admin/login';

  if (isLogin) {
    return (
      <div className="admin-v2-layout admin-theme">
        <div className="admin-login-container">{children}</div>
      </div>
    );
  }

  return <AdminShell>{children}</AdminShell>;
}
