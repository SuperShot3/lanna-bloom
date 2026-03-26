export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Header/Footer/Consent banner are handled by `components/MainSiteChrome.tsx`.
  return <>{children}</>;
}
