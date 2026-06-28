import { redirect } from 'next/navigation';

export default function MarketingSettingsRedirect() {
  redirect('/admin/settings/collections');
}
