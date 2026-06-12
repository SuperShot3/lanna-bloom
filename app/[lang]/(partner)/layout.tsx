/**
 * Partner portal layout: no main site Header/Footer.
 * Partner pages use PartnerNav (with language switcher) as their header.
 */
export default function PartnerLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
