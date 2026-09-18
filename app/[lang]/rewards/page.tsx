import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { isValidLocale } from '@/lib/i18n';
import { createSupabaseCustomerClient } from '@/lib/supabase/serverSsr';
import { REWARD_LIMITS } from '@/lib/rewards/limits';
import { RewardsLoginForm } from './RewardsLoginForm';
import { SignOutButton } from './SignOutButton';
import '../simple-pages.css';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Lanna Bloom Credit | Lanna Bloom',
  robots: { index: false, follow: false },
};

const TYPE_LABELS: Record<string, string> = {
  issue: 'Credit added',
  redeem: 'Used on order',
  reversal: 'Adjustment',
  expire: 'Expired',
};

const thb = (n: number) => `฿${Math.abs(n).toLocaleString('en-US', { maximumFractionDigits: 2 })}`;

export default async function RewardsPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const { lang } = await params;
  const { status } = await searchParams;
  if (!isValidLocale(lang)) notFound();

  const client = await createSupabaseCustomerClient();
  const { data: userData } = client ? await client.auth.getUser() : { data: { user: null } };
  const user = userData.user;

  // RLS scopes both queries to the signed-in customer's own rows.
  const customer = user
    ? (await client!.from('customers').select('id, email').maybeSingle()).data
    : null;
  const transactions = customer
    ? ((
        await client!
          .from('credit_transactions')
          .select('id, type, amount, expires_at, created_at')
          .order('created_at', { ascending: false })
          .limit(50)
      ).data ?? [])
    : [];
  const balance = transactions.reduce((sum, t) => sum + Number(t.amount), 0);

  return (
    <main className="track-order-page">
      <div className="container" style={{ display: 'grid', gap: 20 }}>
        <h1>Lanna Bloom Credit</h1>

        {status === 'link_invalid' && (
          <p role="alert">That sign-in link is invalid or has expired. Please request a new one below.</p>
        )}

        {!user && <RewardsLoginForm lang={lang} />}

        {user && !customer && (
          <>
            <p>We couldn&apos;t find any Lanna Bloom Credit for {user.email}.</p>
            <SignOutButton />
          </>
        )}

        {user && customer && (
          <>
            <section>
              <p style={{ margin: 0 }}>Available</p>
              <p style={{ fontSize: 40, margin: '4px 0', fontWeight: 600 }}>{thb(Math.max(balance, 0))}</p>
              <p style={{ margin: 0 }}>
                You can use up to {thb(REWARD_LIMITS.maxSpendPerOrder)} on your next order.
              </p>
              <p style={{ marginTop: 16 }}>
                <Link href={`/${lang}/catalog`}>Shop Now</Link>
              </p>
            </section>

            <section>
              <h2>Credit history</h2>
              {transactions.length === 0 ? (
                <p>No activity yet.</p>
              ) : (
                <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: 8 }}>
                  {transactions.map((t) => (
                    <li key={t.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                      <span>
                        {TYPE_LABELS[t.type] ?? t.type} ·{' '}
                        {new Date(t.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        {t.type === 'issue' && t.expires_at
                          ? ` · expires ${new Date(t.expires_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`
                          : ''}
                      </span>
                      <strong>
                        {Number(t.amount) > 0 ? '+' : '−'}
                        {thb(Number(t.amount))}
                      </strong>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <SignOutButton />
          </>
        )}
      </div>
    </main>
  );
}
