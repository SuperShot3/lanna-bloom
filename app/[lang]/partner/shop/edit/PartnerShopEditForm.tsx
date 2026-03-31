'use client';

import { useState } from 'react';
import { Inp } from '@/components/partner/Inp';
import { Btn } from '@/components/partner/Btn';
import type { Locale } from '@/lib/i18n';
import type { Partner } from '@/lib/bouquets';
import { updatePartnerProfileAction } from '../actions';

export function PartnerShopEditForm({
  lang,
  partner,
  labels,
}: {
  lang: Locale;
  partner: Partner;
  labels: {
    phoneNumber: string;
    lineOrWhatsapp: string;
    shopAddress: string;
    city: string;
    shopBioEn: string;
    shopBioTh: string;
    save: string;
    saving: string;
  };
}) {
  const [phoneNumber, setPhoneNumber] = useState(partner.phoneNumber ?? '');
  const [lineOrWhatsapp, setLineOrWhatsapp] = useState(partner.lineOrWhatsapp ?? '');
  const [shopAddress, setShopAddress] = useState(partner.shopAddress ?? '');
  const [city, setCity] = useState(partner.city ?? '');
  const [shopBioEn, setShopBioEn] = useState(partner.shopBioEn ?? '');
  const [shopBioTh, setShopBioTh] = useState(partner.shopBioTh ?? '');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData();
    formData.set('lang', lang);
    formData.set('phoneNumber', phoneNumber.trim());
    formData.set('lineOrWhatsapp', lineOrWhatsapp.trim());
    formData.set('shopAddress', shopAddress.trim());
    formData.set('city', city.trim());
    formData.set('shopBioEn', shopBioEn.trim());
    formData.set('shopBioTh', shopBioTh.trim());

    const result = await updatePartnerProfileAction(formData);
    setLoading(false);
    if (result?.error) setError(result.error);
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && <p className="partner-login-error">{error}</p>}
      <Inp label={labels.phoneNumber} type="tel" value={phoneNumber} onChange={setPhoneNumber} required />
      <Inp label={labels.lineOrWhatsapp} value={lineOrWhatsapp} onChange={setLineOrWhatsapp} />
      <div className="partner-inp">
        <label>{labels.shopAddress}</label>
        <textarea value={shopAddress} onChange={(e) => setShopAddress(e.target.value)} />
      </div>
      <Inp label={labels.city} value={city} onChange={setCity} />
      <div className="partner-inp">
        <label>{labels.shopBioEn}</label>
        <textarea value={shopBioEn} onChange={(e) => setShopBioEn(e.target.value)} />
        <p className="partner-inp-hint">
          {lang === 'th' ? 'จะแสดงในหน้าเว็บภาษาอังกฤษ' : 'Shown on English product pages.'}
        </p>
      </div>
      <div className="partner-inp">
        <label>{labels.shopBioTh}</label>
        <textarea value={shopBioTh} onChange={(e) => setShopBioTh(e.target.value)} />
        <p className="partner-inp-hint">
          {lang === 'th' ? 'จะแสดงในหน้าเว็บภาษาไทย' : 'Shown on Thai product pages.'}
        </p>
      </div>
      <div style={{ marginTop: 10 }}>
        <Btn variant="secondary" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
          {loading ? labels.saving : labels.save}
        </Btn>
      </div>
    </form>
  );
}

