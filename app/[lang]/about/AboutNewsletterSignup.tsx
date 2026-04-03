'use client';

import { useState, useCallback } from 'react';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type NewsletterMessage = 'success' | 'already' | 'error' | 'invalid' | null;

export type AboutNewsletterCopy = {
  newsletterTitle: string;
  newsletterHint: string;
  emailPlaceholder: string;
  joinButton: string;
  newsletterSubscribing: string;
  newsletterSuccess: string;
  newsletterAlreadySubscribed: string;
  newsletterError: string;
  newsletterInvalidEmail: string;
};

export function AboutNewsletterSignup({ copy }: { copy: AboutNewsletterCopy }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<NewsletterMessage>(null);
  const [honeypot, setHoneypot] = useState('');

  const validateEmail = useCallback((value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return false;
    return EMAIL_REGEX.test(trimmed);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    const trimmedEmail = email.trim();
    if (!validateEmail(trimmedEmail)) {
      setMessage('invalid');
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: trimmedEmail,
          source: 'about',
          company: honeypot || undefined,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setMessage('error');
        return;
      }

      if (data.message === 'already_subscribed') {
        setMessage('already');
        return;
      }

      setMessage('success');
      setEmail('');
    } catch {
      setMessage('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-stone-200/90 bg-[#fdfbf9] p-4 sm:p-5">
      <h3 className="font-[family-name:var(--font-family-display)] text-lg font-semibold text-[#1A3C34] mb-2">
        {copy.newsletterTitle}
      </h3>
      <p className="text-sm text-stone-600 leading-relaxed mb-4">{copy.newsletterHint}</p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <input
          type="text"
          name="company"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          className="absolute -left-[9999px] w-px h-px opacity-0 pointer-events-none"
        />
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (message) setMessage(null);
            }}
            placeholder={copy.emailPlaceholder}
            disabled={loading}
            required
            aria-invalid={message === 'error' || message === 'invalid'}
            aria-describedby={message ? 'about-newsletter-message' : undefined}
            className="flex-1 px-4 py-2.5 text-sm rounded-lg border border-stone-200 bg-white focus:ring-[#C5A059] focus:border-[#C5A059] disabled:opacity-60 disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 bg-[#1A3C34] text-white text-sm rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed shrink-0 cursor-pointer"
          >
            {loading ? copy.newsletterSubscribing : copy.joinButton}
          </button>
        </div>
        {message && (
          <p
            id="about-newsletter-message"
            role="status"
            aria-live="polite"
            className={`text-sm ${
              message === 'success' || message === 'already' ? 'text-[#1A3C34]' : 'text-red-600'
            }`}
          >
            {message === 'success' && copy.newsletterSuccess}
            {message === 'already' && copy.newsletterAlreadySubscribed}
            {message === 'error' && copy.newsletterError}
            {message === 'invalid' && copy.newsletterInvalidEmail}
          </p>
        )}
      </form>
    </div>
  );
}
