import { getCatalogSiteSettingsForAdmin } from '@/lib/catalogAdmin';
import { HeroSettingsClient } from './HeroSettingsClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AdminHeroSettingsPage() {
  const settings = await getCatalogSiteSettingsForAdmin();
  return <HeroSettingsClient settings={settings} />;
}
