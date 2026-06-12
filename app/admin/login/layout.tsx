export default function AdminLoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin-layout admin-theme">
      <div className="admin-login-container">{children}</div>
    </div>
  );
}
