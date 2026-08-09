import { AdminSessionProvider } from './AdminSessionProvider';
import './admin.css';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <link rel="stylesheet" href="/vendor/material-symbols-admin.css" />
      <AdminSessionProvider>{children}</AdminSessionProvider>
    </>
  );
}
