'use client';

import { useState } from 'react';
import Link from 'next/link';
import { updateProductAction, deleteProductAction } from '../../actions';
import { Inp } from '@/components/partner/Inp';
import { Sel } from '@/components/partner/Sel';
import { Btn } from '@/components/partner/Btn';
import { Card } from '@/components/partner/Card';
import { translations } from '@/lib/i18n';
import { PREP_TIME_OPTIONS } from '@/lib/partnerPortal';
import type { Locale } from '@/lib/i18n';

const OCCASION_OPTIONS = [
  { value: '', labelEn: '—', labelTh: '—' },
  { value: 'birthday', labelEn: 'Birthday', labelTh: 'วันเกิด' },
  { value: 'anniversary', labelEn: 'Anniversary', labelTh: 'ครบรอบ' },
  { value: 'romantic', labelEn: 'Romantic', labelTh: 'โรแมนติก' },
  { value: 'congrats', labelEn: 'Congratulations', labelTh: 'ยินดีด้วย' },
  { value: 'get_well', labelEn: 'Get well', labelTh: 'หายเร็วๆ' },
];

const CATEGORIES = ['balloons', 'gifts', 'money_flowers', 'handmade_floral'] as const;

type ProductEditFormProps = {
  lang: Locale;
  productId: string;
  initial: {
    nameEn: string;
    nameTh?: string;
    descriptionEn?: string;
    descriptionTh?: string;
    category: string;
    price: number;
    preparationTime?: number;
    occasion?: string;
  };
  backHref: string;
};

export function ProductEditForm({ lang, productId, initial, backHref }: ProductEditFormProps) {
  const [nameEn, setNameEn] = useState(initial.nameEn);
  const [nameTh, setNameTh] = useState(initial.nameTh ?? '');
  const [descriptionEn, setDescriptionEn] = useState(initial.descriptionEn ?? '');
  const [descriptionTh, setDescriptionTh] = useState(initial.descriptionTh ?? '');
  const [price, setPrice] = useState(String(initial.price || ''));
  const [preparationTime, setPreparationTime] = useState(
    initial.preparationTime != null ? String(initial.preparationTime) : ''
  );
  const [occasion, setOccasion] = useState(initial.occasion ?? '');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const t = translations[lang].partnerPortal.addProduct;
  const tPartner = translations[lang].partner;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const formData = new FormData();
    formData.set('lang', lang);
    formData.set('productId', productId);
    formData.set('category', initial.category);
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

    const result = await updateProductAction(formData);
    setLoading(false);
    if (result?.error) setError(result.error);
  }

  async function handleDelete() {
    const confirmMsg = translations[lang].partner.deleteProductConfirm;
    if (!confirm(confirmMsg)) return;
    setDeleting(true);
    setError(null);
    const result = await deleteProductAction(productId, lang);
    setDeleting(false);
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
          <p className="partner-file-hint" style={{ fontSize: 13, color: 'var(--color-muted)', marginTop: 4 }}>
            {lang === 'th' ? 'เว้นว่างไว้เพื่อใช้รูปเดิม' : 'Leave empty to keep existing images.'}
          </p>
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
        <Link href={backHref}>
          <Btn type="button" variant="ghost">
            {lang === 'th' ? 'กลับรายการสินค้า' : 'Back to products'}
          </Btn>
        </Link>
        <Btn type="submit" disabled={loading}>
          {loading
            ? lang === 'th'
              ? 'กำลังบันทึก…'
              : 'Saving…'
            : tPartner.saveDraft}
        </Btn>
      </div>
      <div className="partner-add-product-actions" style={{ marginTop: 12, justifyContent: 'flex-end' }}>
        <Btn
          type="button"
          variant="ghost"
          onClick={handleDelete}
          disabled={loading || deleting}
          style={{ color: 'var(--color-error, #b91c1c)' }}
        >
          {deleting
            ? lang === 'th'
              ? 'กำลังลบ…'
              : 'Deleting…'
            : tPartner.deleteProduct}
        </Btn>
      </div>
    </form>
  );
}
