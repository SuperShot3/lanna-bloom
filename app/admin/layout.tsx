import { AdminSessionProvider } from './AdminSessionProvider';
import { AdminLayoutWrapper } from './components/AdminLayoutWrapper';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminSessionProvider>
      <AdminLayoutWrapper>{children}</AdminLayoutWrapper>
    </AdminSessionProvider>
  );
}
