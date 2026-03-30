'use client';

import { useState, useEffect, useMemo } from 'react';
import { applyPartnerAction } from './actions';
import { Stepper } from '@/components/partner/Stepper';
import { Card } from '@/components/partner/Card';
import { Inp } from '@/components/partner/Inp';
import { Tx } from '@/components/partner/Tx';
import { Sel } from '@/components/partner/Sel';
import { Toggle } from '@/components/partner/Toggle';
import { Chips } from '@/components/partner/Chips';
import { Btn } from '@/components/partner/Btn';
import { SecTitle } from '@/components/partner/SecTitle';
import Link from 'next/link';
import { translations } from '@/lib/i18n';
import { DISTRICTS, CATEGORY_OPTIONS, PREP_TIME_OPTIONS } from '@/lib/partnerPortal';
import type { Locale } from '@/lib/i18n';

const STORAGE_KEY = 'partner-apply-draft';
const MAX_CATEGORIES = 3;
const CUSTOM_PREFIX = 'custom:';

type FormState = {
  shopName: string;
  contactName: string;
  email: string;
  lineId: string;
  phone: string;
  instagram: string;
  facebook: string;
  address: string;
  district: string;
  selfDeliver: boolean;
  deliveryZones: string;
  deliveryFee: string;
  categories: string[];
  prepTime: string;
  cutoff: string;
  maxOrders: string;
  portfolioLinks: string;
  experienceNote: string;
};

const initialForm: FormState = {
  shopName: '',
  contactName: '',
  email: '',
  lineId: '',
  phone: '',
  instagram: '',
  facebook: '',
  address: '',
  district: '',
  selfDeliver: false,
  deliveryZones: '',
  deliveryFee: '',
  categories: [],
  prepTime: '60',
  cutoff: '',
  maxOrders: '',
  portfolioLinks: '',
  experienceNote: '',
};

export function ApplyWizard({ lang }: { lang: Locale }) {
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [f, setF] = useState<FormState>(initialForm);
  const [customCategoryInput, setCustomCategoryInput] = useState('');
  const [categoryAddMsg, setCategoryAddMsg] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = typeof window !== 'undefined' && sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { form?: FormState; step?: number };
        if (parsed.form) {
          let merged = { ...initialForm, ...parsed.form };
          if (Array.isArray(merged.categories) && merged.categories.length > MAX_CATEGORIES) {
            merged = { ...merged, categories: merged.categories.slice(0, MAX_CATEGORIES) };
          }
          setF(merged);
        }
        if (typeof parsed.step === 'number' && parsed.step >= 0 && parsed.step <= 3) setStep(parsed.step);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ form: f, step }));
    } catch {
      /* ignore */
    }
  }, [f, step]);

  const t = translations[lang].partnerPortal.apply;
  const hiw = translations[lang].partnerPortal.howItWorks;
  const steps = [t.stepContact, t.stepLocation, t.stepCategories, t.stepSamples];

  const u = <K extends keyof FormState>(k: K, v: FormState[K]) => {
    setF((p) => ({ ...p, [k]: v }));
  };

  async function handleSubmit() {
    if (submitting) return;
    setError(null);
    if (f.categories.length === 0) {
      setError(t.categoriesRequired);
      return;
    }
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.set('lang', lang);
      formData.set('shopName', f.shopName);
      formData.set('contactName', f.contactName);
      formData.set('email', f.email);
      formData.set('lineId', f.lineId);
      formData.set('phone', f.phone);
      formData.set('instagram', f.instagram);
      formData.set('facebook', f.facebook);
      formData.set('address', f.address);
      formData.set('district', f.district);
      formData.set('selfDeliver', String(f.selfDeliver));
      formData.set('deliveryZones', f.deliveryZones);
      formData.set('deliveryFee', f.deliveryFee);
      formData.set('categories', JSON.stringify(f.categories));
      formData.set('prepTime', f.prepTime);
      formData.set('cutoff', f.cutoff);
      formData.set('maxOrders', f.maxOrders);
      formData.set('portfolioLinks', f.portfolioLinks);
      formData.set('experienceNote', f.experienceNote);

      const result = await applyPartnerAction(formData);
      if (result?.error) {
        setError(result.error);
      }
    } finally {
      setSubmitting(false);
    }
  }

  const districtOptions = DISTRICTS.map((d) => ({
    value: d.value,
    label: lang === 'th' ? d.labelTh : d.labelEn,
  }));

  const prepOptions = PREP_TIME_OPTIONS.map((p) => ({
    value: p.value,
    label: lang === 'th' ? p.labelTh : p.labelEn,
  }));

  const chipOptions = useMemo(
    () =>
      CATEGORY_OPTIONS.map((c) => ({
        value: c.value,
        label: lang === 'th' ? c.labelTh : c.labelEn,
        icon: c.icon,
      })),
    [lang]
  );

  const mergedChipOptions = useMemo(() => {
    const customs = f.categories
      .filter((c) => c.startsWith(CUSTOM_PREFIX))
      .map((c) => ({
        value: c,
        label: c.slice(CUSTOM_PREFIX.length).trim() || c,
        icon: '✨',
      }));
    return [...chipOptions, ...customs];
  }, [chipOptions, f.categories]);

  function toggleCategory(value: string) {
    setCategoryAddMsg(null);
    setF((p) => {
      const cur = p.categories;
      if (cur.includes(value)) {
        return { ...p, categories: cur.filter((x) => x !== value) };
      }
      if (cur.length >= MAX_CATEGORIES) return p;
      return { ...p, categories: [...cur, value] };
    });
  }

  function addCustomCategory() {
    setCategoryAddMsg(null);
    const raw = customCategoryInput.trim();
    if (!raw) return;
    if (f.categories.length >= MAX_CATEGORIES) {
      setCategoryAddMsg(t.categoriesLimitReached);
      return;
    }
    const normalized = raw.replace(/\s+/g, ' ').slice(0, 60);
    const lower = normalized.toLowerCase();

    const presetMatch = CATEGORY_OPTIONS.find(
      (c) =>
        c.value === lower ||
        c.labelEn.toLowerCase() === lower ||
        c.labelTh.trim() === normalized
    );
    if (presetMatch) {
      if (f.categories.includes(presetMatch.value)) {
        setCategoryAddMsg(t.categoriesDuplicate);
        return;
      }
      if (f.categories.length >= MAX_CATEGORIES) {
        setCategoryAddMsg(t.categoriesLimitReached);
        return;
      }
      setF((p) => ({ ...p, categories: [...p.categories, presetMatch.value] }));
      setCustomCategoryInput('');
      return;
    }

    const value = `${CUSTOM_PREFIX}${normalized}`;
    if (f.categories.includes(value)) {
      setCategoryAddMsg(t.categoriesDuplicate);
      return;
    }
    const dupCustom = f.categories.some(
      (c) =>
        c.startsWith(CUSTOM_PREFIX) &&
        c.slice(CUSTOM_PREFIX.length).toLowerCase() === normalized.toLowerCase()
    );
    if (dupCustom) {
      setCategoryAddMsg(t.categoriesDuplicate);
      return;
    }

    setF((p) => ({ ...p, categories: [...p.categories, value] }));
    setCustomCategoryInput('');
  }

  function goNext() {
    setError(null);
    if (step === 2 && f.categories.length === 0) {
      setError(t.categoriesRequired);
      return;
    }
    if (step < 3) setStep(step + 1);
  }

  return (
    <div className="partner-apply-wizard">
      {step === 0 && (
        <div className="partner-apply-hero">
          <div className="partner-apply-hero-badge">LANNA BLOOM × PARTNER</div>
          <h1 className="partner-apply-hero-title">
            {lang === 'th' ? 'ร่วมเป็น Partner กับ Lanna Bloom 🌸' : 'Become a Partner with Lanna Bloom 🌸'}
          </h1>
          <p className="partner-apply-hero-how-link">
            <Link href={`/${lang}/partner/how-it-works`}>{hiw.applyHeroLink}</Link>
          </p>
          <div className="partner-apply-hero-benefits">
            {[
              [lang === 'th' ? '🛒' : '🛒', lang === 'th' ? 'รับออเดอร์จากลูกค้าในเชียงใหม่' : 'Receive orders from Chiang Mai customers', 'Receive orders from Chiang Mai customers'],
              [lang === 'th' ? '📦' : '📦', lang === 'th' ? 'เราช่วยจัดการระบบให้' : 'Platform-managed logistics & payments', 'Platform-managed logistics & payments'],
              [lang === 'th' ? '💬' : '💬', lang === 'th' ? 'ติดต่อง่ายผ่าน LINE ตลอด' : 'Always connected via LINE support', 'Always connected via LINE support'],
            ].map(([icon, th, en]) => (
              <div key={String(th)} className="partner-apply-hero-row">
                <span className="partner-apply-hero-icon">{icon}</span>
                <div>
                  <div className="partner-apply-hero-label">{th}</div>
                  <div className="partner-apply-hero-sublabel">{en}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Stepper steps={steps} current={step} />

      <Card>
        {error && <p className="partner-error" role="alert">{error}</p>}

        {step === 0 && (
          <>
            <SecTitle th={lang === 'th' ? 'ข้อมูลติดต่อ' : 'Contact Information'} en="Contact Information" />
            <Inp label={t.shopName} sub={lang === 'th' ? 'ชื่อที่แสดงในระบบ' : 'Display name'} placeholder={lang === 'th' ? 'เช่น ร้านดอกไม้มาลี' : 'e.g. Mali Flower Shop'} value={f.shopName} onChange={(v) => u('shopName', v)} required />
            <Inp label={t.contactName} placeholder={lang === 'th' ? 'ชื่อ-นามสกุล' : 'Full name'} value={f.contactName} onChange={(v) => u('contactName', v)} required />
            <Inp label={t.email} type="email" placeholder="email@example.com" value={f.email} onChange={(v) => u('email', v)} required />
            <Inp label={t.lineId} placeholder="@lineid" value={f.lineId} onChange={(v) => u('lineId', v)} required />
            <Inp label={t.phone} type="tel" placeholder="08X-XXX-XXXX" value={f.phone} onChange={(v) => u('phone', v)} required />
            <Inp label={t.instagram} placeholder="@yourshop" value={f.instagram} onChange={(v) => u('instagram', v)} />
            <Inp label={t.facebook} placeholder="facebook.com/yourshop" value={f.facebook} onChange={(v) => u('facebook', v)} />
          </>
        )}

        {step === 1 && (
          <>
            <SecTitle th={lang === 'th' ? 'สถานที่และการจัดส่ง' : 'Location & Delivery'} en="Location & Delivery" />
            <Tx label={t.address} hint={t.addressHint} placeholder={lang === 'th' ? 'บ้านเลขที่ ซอย ถนน ตำบล' : 'Street, building, district'} value={f.address} onChange={(v) => u('address', v)} required rows={3} />
            <Sel label={t.district} options={districtOptions} value={f.district} onChange={(v) => u('district', v)} required />
            <Toggle label={t.selfDeliver} sub={lang === 'th' ? 'Self-delivery capability' : 'Self-delivery'} value={f.selfDeliver} onChange={(v) => u('selfDeliver', v)} />
            {f.selfDeliver && (
              <div className="partner-apply-delivery-extra">
                <Tx label={t.deliveryZones} hint={t.deliveryZonesHint} placeholder={lang === 'th' ? 'เช่น นิมมาน, เมือง, สันกำแพง' : 'e.g. Nimman, Mueang, Hang Dong'} value={f.deliveryZones} onChange={(v) => u('deliveryZones', v)} rows={3} />
                <Tx label={t.deliveryFee} hint={t.deliveryFeeHint} placeholder={lang === 'th' ? 'อธิบายนโยบายจัดส่ง...' : 'Explain your delivery policy...'} value={f.deliveryFee} onChange={(v) => u('deliveryFee', v)} rows={3} />
              </div>
            )}
            {!f.selfDeliver && (
              <div className="partner-apply-platform-note">
                📦 {lang === 'th' ? 'ใช้ระบบจัดส่งของ Lanna Bloom' : "We'll handle delivery for you"}
              </div>
            )}
          </>
        )}

        {step === 2 && (
          <>
            <SecTitle
              th={lang === 'th' ? 'สิ่งที่คุณวางแผนจะขายบน Lanna Bloom' : 'What you plan to sell on Lanna Bloom'}
              en="What you plan to sell on Lanna Bloom"
            />
            <div className="partner-apply-chip-label">
              {t.categories} <span className="partner-inp-req">*</span>
            </div>
            <p className="partner-apply-category-hint">{t.categoriesMaxHint}</p>
            <Chips
              options={mergedChipOptions}
              selected={f.categories}
              onToggle={toggleCategory}
              maxSelected={MAX_CATEGORIES}
            />
            <div className="partner-apply-category-add">
              <span className="partner-apply-category-add-label">{t.addOtherCategory}</span>
              <div className="partner-apply-category-add-row">
                <input
                  type="text"
                  placeholder={t.otherCategoryPlaceholder}
                  value={customCategoryInput}
                  onChange={(e) => {
                    setCustomCategoryInput(e.target.value);
                    setCategoryAddMsg(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addCustomCategory();
                    }
                  }}
                  disabled={f.categories.length >= MAX_CATEGORIES}
                  autoComplete="off"
                  aria-label={t.addOtherCategory}
                />
                <Btn
                  type="button"
                  variant="secondary"
                  small
                  onClick={addCustomCategory}
                  disabled={f.categories.length >= MAX_CATEGORIES || !customCategoryInput.trim()}
                >
                  {t.addCategory}
                </Btn>
              </div>
              {categoryAddMsg && (
                <p className="partner-error partner-apply-category-hint" role="status">
                  {categoryAddMsg}
                </p>
              )}
            </div>
            <Sel label={t.prepTime} sub={lang === 'th' ? 'Typical preparation time' : 'Typical prep time'} options={prepOptions} value={f.prepTime} onChange={(v) => u('prepTime', v)} required />
            <Inp label={t.cutoff} hint={t.cutoffHint} placeholder="e.g. 14:00" value={f.cutoff} onChange={(v) => u('cutoff', v)} />
            <Inp label={t.maxOrders} type="number" placeholder="e.g. 20" value={f.maxOrders} onChange={(v) => u('maxOrders', v)} />
          </>
        )}

        {step === 3 && (
          <>
            <SecTitle th={lang === 'th' ? 'ตัวอย่างผลงาน' : 'Portfolio Samples'} en="Portfolio Samples" />
            <Tx label={t.portfolioLinks} hint={t.samplePhotosHint} placeholder={lang === 'th' ? 'https://instagram.com/... หรือ https://drive.google.com/...' : 'https://instagram.com/... or https://drive.google.com/...'} value={f.portfolioLinks} onChange={(v) => u('portfolioLinks', v)} rows={3} />
            <Tx label={t.experienceNote} hint={t.experienceNoteHint} placeholder={lang === 'th' ? 'เล่าเกี่ยวกับร้านของคุณ ความเชี่ยวชาญ ประสบการณ์...' : 'Tell us about your shop, expertise, experience...'} value={f.experienceNote} onChange={(v) => u('experienceNote', v)} rows={4} />
            <div className="partner-apply-submit-note">
              🙏 {lang === 'th' ? 'กดส่งเพื่อให้ทีม Lanna Bloom ตรวจสอบใบสมัครของคุณ' : 'Submit to send your application for review. We will contact you on LINE.'}
            </div>
          </>
        )}
      </Card>

      <div className="partner-apply-actions">
        <Btn variant="ghost" onClick={() => step > 0 && setStep(step - 1)} style={{ visibility: step === 0 ? 'hidden' : 'visible' }}>
          ← {t.back}
        </Btn>
        <div className="partner-apply-actions-right">
          {step < 3 ? (
            <Btn onClick={goNext}>{t.next} →</Btn>
          ) : (
            <Btn variant="rose" onClick={() => handleSubmit()} disabled={submitting}>
              {submitting ? (lang === 'th' ? 'กำลังส่ง…' : 'Submitting…') : `${t.submit} 🌸`}
            </Btn>
          )}
        </div>
      </div>
    </div>
  );
}
