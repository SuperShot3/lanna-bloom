import Link from 'next/link';
import { getSupabaseAdmin } from '@/lib/supabase/server';

type Props = { searchParams: Promise<{ token?: string }> };

export const metadata = {
  title: 'Unsubscribe | Lanna Bloom',
  robots: { index: false, follow: false },
};

export default async function UnsubscribePage({ searchParams }: Props) {
  const { token = '' } = await searchParams;
  const t = (token || '').trim();
  if (!t) {
    return (
      <div style={{ minHeight: '60vh', padding: 24, textAlign: 'center', background: '#fdfcf8' }}>
        <p>Missing unsubscribe link. Return to the email we sent you.</p>
        <Link href="/en" style={{ color: '#967a4d' }}>Home</Link>
      </div>
    );
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return (
      <div style={{ minHeight: '60vh', padding: 24, textAlign: 'center' }}>
        <p>Service temporarily unavailable. Please try again later.</p>
      </div>
    );
  }

  const { data: row, error: qErr } = await supabase
    .from('customer_reminders')
    .select('id, is_active')
    .eq('unsubscribe_token', t)
    .maybeSingle();

  if (qErr || !row) {
    return (
      <div style={{ minHeight: '60vh', padding: 24, textAlign: 'center', background: '#fdfcf8' }}>
        <p>We could not find this link. It may have already been used or is invalid.</p>
        <Link href="/en" style={{ color: '#967a4d' }}>Home</Link>
      </div>
    );
  }

  if (row.is_active) {
    await supabase
      .from('customer_reminders')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', row.id);
  }

  return (
    <div
      style={{
        minHeight: '60vh',
        padding: 32,
        textAlign: 'center',
        background: '#fdfcf8',
        fontFamily: 'Mulish, system-ui, sans-serif',
        color: '#2c2415',
      }}
    >
      <p style={{ fontSize: '1.1rem', maxWidth: 400, margin: '0 auto 1rem' }}>
        You have unsubscribed from Lanna Bloom reminder emails.
      </p>
      <p style={{ fontSize: '0.9rem', color: '#5c4a32', margin: '0 0 1.5rem' }}>
        This does not affect order or payment emails.
      </p>
      <Link href="/en" style={{ color: '#967a4d', fontWeight: 600 }}>
        Back to Lanna Bloom
      </Link>
    </div>
  );
}
