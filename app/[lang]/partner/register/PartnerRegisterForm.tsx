'use client';

import { useState } from 'react';
import { registerPartnerAction } from './actions';
import { translations } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';

export function PartnerRegisterForm({ lang }: { lang: Locale }) {
  const t = translations[lang].partner;
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setError(null);
    const result = await registerPartnerAction(formData);
    if (result?.error) setError(result.error);
  }

  return (
    <form action={handleSubmit} className="partner-form">
      <input type="hidden" name="lang" value={lang} />
      {error && <p className="partner-error" role="alert">{error}</p>}
      <label>
        {t.shopName} <span aria-hidden="true">*</span>
        <input type="text" name="shopName" required autoComplete="organization" />
      </label>
      <label>
        {t.contactName} <span aria-hidden="true">*</span>
        <input type="text" name="contactName" required autoComplete="name" />
      </label>
      <label>
        {t.phoneNumber} <span aria-hidden="true">*</span>
        <input type="tel" name="phoneNumber" required autoComplete="tel" />
      </label>
      <label>
        {t.lineOrWhatsapp}
        <input type="text" name="lineOrWhatsapp" placeholder="LINE ID or WhatsApp number" />
      </label>
      <label>
        {t.shopAddress}
        <textarea name="shopAddress" rows={2} />
      </label>
      <label>
        {t.city}
        <input type="text" name="city" defaultValue="Chiang Mai" autoComplete="address-level2" />
      </label>
      <button type="submit" className="partner-submit">
        {t.submit}
      </button>
    </form>
  );
}
