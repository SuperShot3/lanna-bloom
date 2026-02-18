export default function AdminV2Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="admin-v2-layout">
      <div className="container" style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 20px' }}>
        {children}
      </div>
    </div>
  );
}
