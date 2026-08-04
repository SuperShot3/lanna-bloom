'use client';

import { useEffect, useState } from 'react';
import { applyPartnerAction } from './actions';
import { Card } from '@/components/partner/Card';
import { Inp } from '@/components/partner/Inp';
import { Tx } from '@/components/partner/Tx';
import { Sel } from '@/components/partner/Sel';
import { Btn } from '@/components/partner/Btn';
import { SecTitle } from '@/components/partner/SecTitle';
import { translations, type Locale } from '@/lib/i18n';
import { hasAtLeastOneContactMethod } from '@/lib/partnerApplyValidate';

const STORAGE_KEY = 'partner-apply-draft';

export type ApplyProvinceOption = {
  code: string;
  nameEn: string;
  nameTh: string;
};

type FormState = {
  shopName: string;
  provinceCode: string;
  phone: string;
  lineId: string;
  email: string;
  experienceNote: string;
};

const initialForm: FormState = {
  shopName: '',
  provinceCode: '',
  phone: '',
  lineId: '',
  email: '',
  experienceNote: '',
};

export function ApplyForm({
  lang,
  provinces,
}: {
  lang: Locale;
  provinces: ApplyProvinceOption[];
}) {
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [f, setF] = useState<FormState>(initialForm);

  const t = translations[lang].partnerPortal.apply;
  const hiw = translations[lang].partnerPortal.howItWorks;
  const mailto = `mailto:${hiw.emailDisplay}?subject=${encodeURIComponent(hiw.emailSubject)}`;

  useEffect(() => {
    try {
      const raw = typeof window !== 'undefined' && sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { form?: Partial<FormState> };
      if (parsed.form) {
        setF((prev) => ({
          ...prev,
          shopName: typeof parsed.form?.shopName === 'string' ? parsed.form.shopName : prev.shopName,
          provinceCode:
            typeof parsed.form?.provinceCode === 'string'
              ? parsed.form.provinceCode
              : prev.provinceCode,
          phone: typeof parsed.form?.phone === 'string' ? parsed.form.phone : prev.phone,
          lineId: typeof parsed.form?.lineId === 'string' ? parsed.form.lineId : prev.lineId,
          email: typeof parsed.form?.email === 'string' ? parsed.form.email : prev.email,
          experienceNote:
            typeof parsed.form?.experienceNote === 'string'
              ? parsed.form.experienceNote
              : prev.experienceNote,
        }));
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ form: f }));
    } catch {
      /* ignore */
    }
  }, [f]);

  const u = <K extends keyof FormState>(k: K, v: FormState[K]) => {
    setF((p) => ({ ...p, [k]: v }));
  };

  const provinceOptions = [
    { value: '', label: t.provincePlaceholder },
    ...provinces.map((p) => ({
      value: p.code,
      label: lang === 'th' ? p.nameTh : p.nameEn,
    })),
  ];

  async function handleSubmit() {
    if (submitting) return;
    setError(null);

    if (!f.shopName.trim()) {
      setError(lang === 'th' ? 'กรุณากรอกชื่อร้าน' : 'Shop name is required');
      return;
    }
    if (!f.provinceCode.trim()) {
      setError(lang === 'th' ? 'กรุณาเลือกจังหวัด' : 'Province is required');
      return;
    }
    if (!hasAtLeastOneContactMethod(f)) {
      setError(t.contactHint);
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.set('lang', lang);
      formData.set('shopName', f.shopName);
      formData.set('provinceCode', f.provinceCode);
      formData.set('phone', f.phone);
      formData.set('lineId', f.lineId);
      formData.set('email', f.email);
      formData.set('experienceNote', f.experienceNote);

      const result = await applyPartnerAction(formData);
      if (result?.error) {
        setError(result.error);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <SecTitle
        lang={lang}
        en="Partner application"
        th="สมัครเป็นพาร์ทเนอร์"
      />

      <p style={{ margin: '0 0 1rem', fontSize: '0.95rem', lineHeight: 1.5 }}>
        <a href={mailto}>{t.emailInstead}</a>
        {' ('}
        {hiw.emailDisplay}
        {')'}
      </p>

      <Inp
        label={t.shopName}
        value={f.shopName}
        onChange={(v) => u('shopName', v)}
        required
      />

      <Sel
        label={t.province}
        options={provinceOptions}
        value={f.provinceCode}
        onChange={(v) => u('provinceCode', v)}
        required
      />

      <p className="partner-inp-hint" style={{ marginTop: '0.75rem' }}>
        {t.contactHint}
      </p>
      <Inp label={t.phone} type="tel" value={f.phone} onChange={(v) => u('phone', v)} />
      <Inp label={t.lineId} value={f.lineId} onChange={(v) => u('lineId', v)} />
      <Inp label={t.email} type="email" value={f.email} onChange={(v) => u('email', v)} />

      <Tx
        label={t.message}
        hint={t.messageHint}
        value={f.experienceNote}
        onChange={(v) => u('experienceNote', v)}
        rows={3}
      />

      {error && (
        <p className="partner-apply-error" role="alert" style={{ color: '#c0392b', marginTop: '0.75rem' }}>
          {error}
        </p>
      )}

      <div style={{ marginTop: '1.25rem' }}>
        <Btn type="button" disabled={submitting} onClick={handleSubmit}>
          {submitting ? (lang === 'th' ? 'กำลังส่ง…' : 'Submitting…') : t.submit}
        </Btn>
      </div>
    </Card>
  );
}
