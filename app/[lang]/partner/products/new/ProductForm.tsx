'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createProductAction } from './actions';
import { Inp } from '@/components/partner/Inp';
import { Sel } from '@/components/partner/Sel';
import { Btn } from '@/components/partner/Btn';
import { Card } from '@/components/partner/Card';
import { translations } from '@/lib/i18n';
import { PREP_TIME_OPTIONS } from '@/lib/partnerPortal';
import type { Locale } from '@/lib/i18n';

type ProductFormProps = {
  lang: Locale;
  partnerId: string;
  category: 'balloons' | 'gifts' | 'money_flowers' | 'handmade_floral';
};

const OCCASION_OPTIONS = [
  { value: '', labelEn: '—', labelTh: '—' },
  { value: 'birthday', labelEn: 'Birthday', labelTh: 'วันเกิด' },
  { value: 'anniversary', labelEn: 'Anniversary', labelTh: 'ครบรอบ' },
  { value: 'romantic', labelEn: 'Romantic', labelTh: 'โรแมนติก' },
  { value: 'congrats', labelEn: 'Congratulations', labelTh: 'ยินดีด้วย' },
  { value: 'get_well', labelEn: 'Get well', labelTh: 'หายเร็วๆ' },
];

export function ProductForm({ lang, partnerId, category }: ProductFormProps) {
  const [nameEn, setNameEn] = useState('');
  const [nameTh, setNameTh] = useState('');
  const [descriptionEn, setDescriptionEn] = useState('');
  const [descriptionTh, setDescriptionTh] = useState('');
  const [price, setPrice] = useState('');
  const [preparationTime, setPreparationTime] = useState('');
  const [occasion, setOccasion] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const t = translations[lang].partnerPortal.addProduct;
  const tPartner = translations[lang].partner;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const formData = new FormData();
    formData.set('lang', lang);
    formData.set('partnerId', partnerId);
    formData.set('category', category);
    formData.set('nameEn', nameEn.trim());
    formData.set('nameTh', nameTh.trim());
    formData.set('descriptionEn', descriptionEn.trim());
    formData.set('descriptionTh', descriptionTh.trim());
    formData.set('price', price.trim());
    formData.set('preparationTime', preparationTime);
    formData.set('occasion', occasion);

    const images = (e.target as HTMLFormElement).querySelectorAll('input[type="file"]');
    images.forEach((input, i) => {
      const file = (input as HTMLInputElement).files?.[0];
      if (file) formData.set(`image${i + 1}`, file);
    });

    const result = await createProductAction(formData);
    setLoading(false);
    if (result?.error) setError(result.error);
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        {error && <p className="partner-login-error">{error}</p>}
        <Inp label={t.nameEn} value={nameEn} onChange={setNameEn} required />
        <Inp label={t.nameTh} value={nameTh} onChange={setNameTh} />
        <Inp
          label={t.descriptionEn}
          value={descriptionEn}
          onChange={setDescriptionEn}
          placeholder={lang === 'th' ? 'รายละเอียดสินค้า' : 'Product description'}
        />
        <Inp
          label={t.descriptionTh}
          value={descriptionTh}
          onChange={setDescriptionTh}
        />
        <Inp
          label={t.price}
          type="number"
          value={price}
          onChange={setPrice}
          required
          placeholder="0"
        />
        <div className="partner-inp">
          <label>{t.images} *</label>
          <div className="partner-product-images">
            {[1, 2, 3].map((i) => (
              <input
                key={i}
                type="file"
                name={`image${i}`}
                accept="image/*"
                className="partner-product-image-input"
              />
            ))}
          </div>
        </div>
        <Sel
          label={lang === 'th' ? 'เวลาเตรียม (นาที)' : 'Prep time (min)'}
          options={[
            { value: '', label: lang === 'th' ? '—' : '—' },
            ...PREP_TIME_OPTIONS.map((o) => ({
              value: o.value,
              label: lang === 'th' ? o.labelTh : o.labelEn,
            })),
          ]}
          value={preparationTime}
          onChange={setPreparationTime}
        />
        <Sel
          label={lang === 'th' ? 'โอกาส' : 'Occasion'}
          options={OCCASION_OPTIONS.map((o) => ({
            value: o.value,
            label: lang === 'th' ? o.labelTh : o.labelEn,
          }))}
          value={occasion}
          onChange={setOccasion}
        />
      </Card>
      <div className="partner-add-product-actions" style={{ marginTop: 16 }}>
        <Link href={`/${lang}/partner`}>
          <Btn type="button" variant="ghost">
            {tPartner.backToDashboard}
          </Btn>
        </Link>
        <Btn type="submit" disabled={loading}>
          {loading ? (lang === 'th' ? 'กำลังส่ง…' : 'Submitting…') : t.submit}
        </Btn>
      </div>
    </form>
  );
}
