'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { translations } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';
import { MessengerLinks } from './MessengerLinks';
import { PaymentBadges } from './PaymentBadges';
import { SocialLinks } from './SocialLinks';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type NewsletterMessage = 'success' | 'already' | 'error' | 'invalid' | null;

export function Footer({ lang }: { lang: Locale }) {
  const t = translations[lang].footer;
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<NewsletterMessage>(null);
  const [honeypot, setHoneypot] = useState('');

  const validateEmail = useCallback((value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return false;
    return EMAIL_REGEX.test(trimmed);
  }, []);

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
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
          source: 'footer',
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
    <footer className="bg-stone-50 pt-20 pb-10 border-t border-stone-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          <div>
            <Link href={`/${lang}`} className="flex items-center gap-2.5 mb-6">
              <Image
                src="/logo_icon_64.png"
                alt=""
                width={40}
                height={40}
                className="w-10 h-10 shrink-0 object-contain rounded-full bg-transparent"
              />
              <span className="font-[family-name:var(--font-family-display)] text-2xl font-semibold tracking-tight text-[#1A3C34]">
                Lanna Bloom
              </span>
            </Link>
            <p className="text-stone-500 text-sm leading-relaxed mb-6">{t.tagline}</p>
            <div className="flex gap-4 items-center flex-wrap">
              <SocialLinks />
              <MessengerLinks />
            </div>
          </div>
          <div>
            <h4 className="font-bold mb-6">{t.shop}</h4>
            <ul className="space-y-3 text-sm text-stone-500">
              <li>
                <Link href={`/${lang}/catalog`} className="hover:text-[#C5A059] transition-colors">
                  {t.popularBouquets}
                </Link>
              </li>
              <li>
                <Link href={`/${lang}/catalog`} className="hover:text-[#C5A059] transition-colors">
                  {t.occasions}
                </Link>
              </li>
              <li>
                <Link href={`/${lang}/catalog`} className="hover:text-[#C5A059] transition-colors">
                  {t.subscription}
                </Link>
              </li>
              <li>
                <Link href={`/${lang}/catalog`} className="hover:text-[#C5A059] transition-colors">
                  {t.giftCards}
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-6">{t.company}</h4>
            <ul className="space-y-3 text-sm text-stone-500">
              <li>
                <Link href={`/${lang}/info`} className="hover:text-[#C5A059] transition-colors">
                  {t.aboutUs}
                </Link>
              </li>
              <li>
                <Link href={`/${lang}/partner/apply`} className="hover:text-[#C5A059] transition-colors">
                  {t.partnerFlorists}
                </Link>
              </li>
              <li>
                <Link href={`/${lang}/contact`} className="hover:text-[#C5A059] transition-colors">
                  {t.contact}
                </Link>
              </li>
              <li>
                <Link href={`/${lang}/contact#location`} className="hover:text-[#C5A059] transition-colors">
                  {t.location}
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-6">{t.newsletter}</h4>
            <p className="text-sm text-stone-500 mb-4">{t.newsletterText}</p>
            <form onSubmit={handleNewsletterSubmit} className="flex flex-col gap-2">
              {/* Honeypot: hidden from users, bots may fill it */}
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
              <div className="flex gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (message) setMessage(null);
                  }}
                  placeholder={t.emailPlaceholder}
                  disabled={loading}
                  required
                  aria-invalid={message === 'error' || message === 'invalid'}
                  aria-describedby={message ? 'newsletter-message' : undefined}
                  className="flex-1 px-4 py-2 text-sm rounded-lg border border-stone-200 bg-white focus:ring-[#C5A059] focus:border-[#C5A059] disabled:opacity-60 disabled:cursor-not-allowed"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-[#1A3C34] text-white text-sm rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed shrink-0"
                >
                  {loading ? t.newsletterSubscribing : t.join}
                </button>
              </div>
              {message && (
                <p
                  id="newsletter-message"
                  role="status"
                  aria-live="polite"
                  className={`text-sm ${
                    message === 'success' || message === 'already'
                      ? 'text-[#1A3C34]'
                      : 'text-red-600'
                  }`}
                >
                  {message === 'success' && t.newsletterSuccess}
                  {message === 'already' && t.newsletterAlreadySubscribed}
                  {message === 'error' && t.newsletterError}
                  {message === 'invalid' && t.newsletterInvalidEmail}
                </p>
              )}
            </form>
          </div>
        </div>
        <div className="flex flex-col md:flex-row justify-between items-center pt-8 border-t border-stone-200 text-xs text-stone-400">
          <p>{t.copyright}</p>
          <div className="flex gap-6 mt-4 md:mt-0">
            <Link href={`/${lang}/refund-replacement`} className="hover:text-stone-600 transition-colors">
              {t.refundPolicy}
            </Link>
            <Link href={`/${lang}/contact`} className="hover:text-stone-600 transition-colors">
              {t.termsOfService}
            </Link>
            <Link href={`/${lang}/refund-replacement`} className="hover:text-stone-600 transition-colors">
              {t.privacyPolicy}
            </Link>
          </div>
        </div>
        <div className="flex justify-center mt-6">
          <PaymentBadges lang={lang} compact />
        </div>
        <div className="flex justify-center mt-4">
          <img
            src="https://dbdregistered.dbd.go.th/api/public/banner?param=867714DAF3E4ED6944FA5672C4E6D1C4A2114631CF57F4DB847153673BC31A6B"
            alt="DBD Verified (Thailand Department of Business Development)"
            className="h-10 w-10 object-contain"
            loading="lazy"
            decoding="async"
          />
        </div>
      </div>
    </footer>
  );
}
