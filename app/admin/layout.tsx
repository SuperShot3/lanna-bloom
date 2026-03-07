import { AdminSessionProvider } from './AdminSessionProvider';
import { AdminLayoutWrapper } from './components/AdminLayoutWrapper';

export default function AdminV2Layout({
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
