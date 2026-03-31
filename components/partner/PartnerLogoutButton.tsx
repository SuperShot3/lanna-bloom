'use client';

import { useRouter } from 'next/navigation';
import { createPartnerBrowserClient } from '@/lib/supabase/partnerAuth';
import type { Locale } from '@/lib/i18n';
import { translations } from '@/lib/i18n';

type PartnerLogoutButtonProps = { lang: Locale };

export function PartnerLogoutButton({ lang }: PartnerLogoutButtonProps) {
  const router = useRouter();
  const t = translations[lang].partnerPortal.login;

  async function handleLogout() {
    const supabase = createPartnerBrowserClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
    router.push(`/${lang}/partner/login`);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="partner-btn partner-btn--ghost partner-btn--small"
    >
      {t.logOut}
    </button>
  );
}
