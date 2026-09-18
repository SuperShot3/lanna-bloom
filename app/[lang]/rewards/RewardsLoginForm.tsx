'use client';

import { useState } from 'react';

export function RewardsLoginForm({ lang }: { lang: string }) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setState('sending');
    try {
      const res = await fetch('/api/rewards/magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, lang }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Something went wrong. Please try again.');
        setState('idle');
        return;
      }
      setState('sent');
    } catch {
      setError('Network error. Please try again.');
      setState('idle');
    }
  };

  if (state === 'sent') {
    return (
      <p role="status">
        If that email has Lanna Bloom Credit, we&apos;ve sent you a secure sign-in link. Please check your inbox
        (and spam folder).
      </p>
    );
  }

  return (
    <form onSubmit={submit} style={{ display: 'grid', gap: 12, maxWidth: 420 }}>
      <label htmlFor="rewards-email">Enter your email to check your Lanna Bloom Credit</label>
      <input
        id="rewards-email"
        type="email"
        required
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        style={{ padding: '10px 12px', border: '1px solid #ccc', borderRadius: 8 }}
      />
      {error && <p role="alert" style={{ color: '#b00020', margin: 0 }}>{error}</p>}
      <button type="submit" disabled={state === 'sending'} style={{ padding: '10px 16px', borderRadius: 8 }}>
        {state === 'sending' ? 'Sending…' : 'Email me a sign-in link'}
      </button>
    </form>
  );
}
