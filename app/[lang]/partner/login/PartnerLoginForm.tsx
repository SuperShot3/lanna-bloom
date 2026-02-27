'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createPartnerBrowserClient } from '@/lib/supabase/partnerAuth';
import { Inp } from '@/components/partner/Inp';
import { Btn } from '@/components/partner/Btn';
import { translations, type Locale } from '@/lib/i18n';

type PartnerLoginFormProps = { lang: Locale };

export function PartnerLoginForm({ lang }: PartnerLoginFormProps) {
  const router = useRouter();
  const t = translations[lang].partnerPortal.login;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const supabase = createPartnerBrowserClient();
    if (!supabase) {
      setError(
        'Partner login is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your environment (and deploy settings).'
      );
      return;
    }
    setLoading(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);
    if (signInError) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[Partner login] Supabase error:', signInError);
      }
      const msg =
        signInError.message?.toLowerCase().includes('invalid') ||
        signInError.message?.toLowerCase().includes('credentials')
          ? t.errorInvalid
          : signInError.message || t.errorGeneric;
      setError(msg);
      return;
    }
    router.push(`/${lang}/partner`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="partner-login-form">
      {error && <p className="partner-login-error">{error}</p>}
      <Inp
        label={t.email}
        type="email"
        value={email}
        onChange={setEmail}
        required
        placeholder={lang === 'th' ? 'example@email.com' : 'you@example.com'}
      />
      <Inp
        label={t.password}
        type="password"
        value={password}
        onChange={setPassword}
        required
      />
      <Btn type="submit" disabled={loading}>
        {loading ? t.signingIn : t.signIn}
      </Btn>
    </form>
  );
}
