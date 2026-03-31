'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { BouquetForm } from '@/app/[lang]/partner/dashboard/[partnerId]/bouquets/BouquetForm';
import { createBouquetAction, createProductAction } from './actions';
import { Stepper } from '@/components/partner/Stepper';
import { Card } from '@/components/partner/Card';
import { Chips } from '@/components/partner/Chips';
import { Btn } from '@/components/partner/Btn';
import { Inp } from '@/components/partner/Inp';
import { Sel } from '@/components/partner/Sel';
import { translations } from '@/lib/i18n';
import {
  CATEGORY_OPTIONS,
  PREP_TIME_OPTIONS,
  OCCASION_OPTIONS,
} from '@/lib/partnerPortal';
import type { Locale } from '@/lib/i18n';

const MAX_IMAGES = 5;

type Props = { lang: Locale; partnerId: string };

export function AddProductWizard({ lang, partnerId }: Props) {
  const [step, setStep] = useState(1);
  const [showBouquetForm, setShowBouquetForm] = useState(false);

  // Category
  const [category, setCategory] = useState('');

  // Product details
  const [nameEn, setNameEn] = useState('');
  const [nameTh, setNameTh] = useState('');
  const [price, setPrice] = useState('');
  const [prepTime, setPrepTime] = useState('');
  const [occasions, setOccasions] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState('');
  const [descriptionEn, setDescriptionEn] = useState('');
  const [descriptionTh, setDescriptionTh] = useState('');
  const [showDescription, setShowDescription] = useState(false);

  // Images: preview data URLs and File objects
  const [imagePreviews, setImagePreviews] = useState<(string | null)[]>(
    Array(MAX_IMAGES).fill(null)
  );
  const [imageFiles, setImageFiles] = useState<(File | null)[]>(
    Array(MAX_IMAGES).fill(null)
  );
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Validation & submission
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [imageError, setImageError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const t = translations[lang].partnerPortal.addProduct;
  const tPartner = translations[lang].partner;

  const categoryOptions = CATEGORY_OPTIONS.map((c) => ({
    value: c.value,
    label: lang === 'th' ? c.labelTh : c.labelEn,
    icon: c.icon,
  }));

  const categoryLabel =
    CATEGORY_OPTIONS.find((c) => c.value === category)?.[
      lang === 'th' ? 'labelTh' : 'labelEn'
    ] ?? category;

  const prepOptions = [
    { value: '', label: lang === 'th' ? 'เลือก...' : 'Select...' },
    ...PREP_TIME_OPTIONS.map((o) => ({
      value: o.value,
      label: lang === 'th' ? o.labelTh : o.labelEn,
    })),
  ];

  const occasionOptions = OCCASION_OPTIONS.map((o) => ({
    value: o.value,
    label: lang === 'th' ? o.labelTh : o.labelEn,
  }));

  // ── Bouquet form redirect ──
  if (showBouquetForm && category === 'flowers') {
    return (
      <>
        <h1 className="partner-add-product-title">{tPartner.addBouquet}</h1>
        <p className="partner-add-product-sub">{tPartner.saveDraft}</p>
        <BouquetForm
          lang={lang}
          partnerId={partnerId}
          action={createBouquetAction}
          submitLabel={tPartner.saveDraft}
          backHref={`/${lang}/partner`}
          backLabel={tPartner.backToDashboard}
        />
      </>
    );
  }

  // ── Image handlers ──
  function handleImageSelect(idx: number) {
    fileInputRefs.current[idx]?.click();
  }

  function handleFileChange(idx: number, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSizeMB = 10;
    if (file.size > maxSizeMB * 1024 * 1024) {
      setImageError(
        lang === 'th'
          ? `ไฟล์ใหญ่เกินไป (สูงสุด ${maxSizeMB}MB)`
          : `File too large (max ${maxSizeMB}MB)`
      );
      if (fileInputRefs.current[idx]) fileInputRefs.current[idx]!.value = '';
      return;
    }

    if (!file.type.startsWith('image/')) {
      setImageError(
        lang === 'th'
          ? 'กรุณาเลือกไฟล์รูปภาพ'
          : 'Please select an image file'
      );
      if (fileInputRefs.current[idx]) fileInputRefs.current[idx]!.value = '';
      return;
    }

    setImageError(null);

    const reader = new FileReader();
    reader.onerror = () => {
      setImageError(
        lang === 'th'
          ? 'ไม่สามารถอ่านไฟล์ได้ กรุณาลองอีกครั้ง'
          : 'Could not read file. Please try again.'
      );
    };
    reader.onload = (ev) => {
      setImagePreviews((prev) => {
        const next = [...prev];
        next[idx] = ev.target?.result as string;
        return next;
      });
    };
    reader.readAsDataURL(file);

    setImageFiles((prev) => {
      const next = [...prev];
      next[idx] = file;
      return next;
    });
    if (errors.images) setErrors((prev) => ({ ...prev, images: false }));
  }

  function handleRemoveImage(idx: number) {
    setImagePreviews((prev) => {
      const next = [...prev];
      next[idx] = null;
      return next;
    });
    setImageFiles((prev) => {
      const next = [...prev];
      next[idx] = null;
      return next;
    });
    if (fileInputRefs.current[idx]) {
      fileInputRefs.current[idx]!.value = '';
    }
    setImageError(null);
  }

  // ── Validation ──
  function validateStep2(): boolean {
    const newErrors: Record<string, boolean> = {};
    if (!nameEn.trim()) newErrors.nameEn = true;
    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum <= 0) newErrors.price = true;
    if (!imageFiles.some((f) => f !== null)) newErrors.images = true;
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  // ── Navigation ──
  function goNext() {
    if (step === 1) {
      if (!category) return;
      setStep(2);
      window.scrollTo(0, 0);
    } else if (step === 2) {
      if (category === 'flowers') return;
      if (!validateStep2()) return;
      setStep(3);
      window.scrollTo(0, 0);
    } else if (step === 3) {
      handleSubmit();
    }
  }

  function goBack() {
    if (step === 2) {
      setStep(1);
      window.scrollTo(0, 0);
    } else if (step === 3) {
      setStep(2);
      window.scrollTo(0, 0);
    }
  }

  // ── Submit ──
  async function handleSubmit() {
    setLoading(true);
    setServerError(null);

    const formData = new FormData();
    formData.set('lang', lang);
    formData.set('partnerId', partnerId);
    formData.set('category', category);
    formData.set('nameEn', nameEn.trim());
    formData.set('nameTh', nameTh.trim());
    formData.set('descriptionEn', descriptionEn.trim());
    formData.set('descriptionTh', descriptionTh.trim());
    formData.set('price', price.trim());
    formData.set('preparationTime', prepTime);
    formData.set('occasions', occasions.join(','));
    formData.set('customTag', customTag.trim());

    let fileIdx = 1;
    for (const file of imageFiles) {
      if (file) {
        formData.set(`image${fileIdx}`, file);
        fileIdx++;
      }
    }

    const result = await createProductAction(formData);
    setLoading(false);

    if (result && 'error' in result && result.error) {
      setServerError(result.error);
    } else if (result && 'success' in result && result.success) {
      setStep(4);
      window.scrollTo(0, 0);
    }
  }

  function handleAddAnother() {
    setStep(1);
    setCategory('');
    setNameEn('');
    setNameTh('');
    setPrice('');
    setPrepTime('');
    setOccasions([]);
    setCustomTag('');
    setDescriptionEn('');
    setDescriptionTh('');
    setShowDescription(false);
    setImagePreviews(Array(MAX_IMAGES).fill(null));
    setImageFiles(Array(MAX_IMAGES).fill(null));
    setErrors({});
    setServerError(null);
    window.scrollTo(0, 0);
  }

  function toggleOccasion(value: string) {
    setOccasions((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  }

  // ── Step label for stepper ──
  const stepLabels = [t.stepCategory, t.stepDetails, t.stepReview];
  const imgCount = imageFiles.filter(Boolean).length;
  const prepLabel =
    PREP_TIME_OPTIONS.find((o) => o.value === prepTime)?.[
      lang === 'th' ? 'labelTh' : 'labelEn'
    ] ?? '—';
  const occasionLabels = occasions
    .map(
      (v) =>
        OCCASION_OPTIONS.find((o) => o.value === v)?.[
          lang === 'th' ? 'labelTh' : 'labelEn'
        ] ?? v
    )
    .join(', ');

  // ── Button state ──
  let nextLabel = lang === 'th' ? 'เลือกหมวดหมู่' : 'Select a category';
  let nextDisabled = true;
  let backVisible = false;
  let nextVisible = true;

  if (step === 1 && category) {
    nextLabel = lang === 'th' ? 'ดำเนินการต่อ →' : 'Continue →';
    nextDisabled = false;
  }
  if (step === 2) {
    backVisible = true;
    if (category === 'flowers') {
      nextVisible = false;
    } else {
      nextLabel = lang === 'th' ? 'ตรวจสอบ →' : 'Review →';
      nextDisabled = false;
    }
  }
  if (step === 3) {
    backVisible = true;
    nextLabel = loading
      ? lang === 'th'
        ? 'กำลังบันทึก…'
        : 'Saving…'
      : lang === 'th'
        ? 'ส่งสินค้า'
        : 'Submit product';
    nextDisabled = loading;
  }
  if (step === 4) {
    nextVisible = false;
    backVisible = false;
  }

  return (
    <>
      {/* Header */}
      <div className="partner-wizard-header">
        <h1 className="partner-add-product-title">{t.title}</h1>
        <p className="partner-add-product-sub">
          {lang === 'th'
            ? 'เพิ่มสินค้าใหม่สำหรับลูกค้า'
            : 'List a new item for customers to purchase'}
        </p>
      </div>

      {/* Stepper */}
      {step <= 3 && (
        <Stepper steps={stepLabels} current={step - 1} />
      )}

      {/* ── STEP 1: Category ── */}
      {step === 1 && (
        <Card>
          <div className="partner-card-title">
            {lang === 'th' ? 'คุณขายอะไร?' : 'What are you selling?'}
          </div>
          <Chips
            options={categoryOptions}
            selected={category ? [category] : []}
            onToggle={(v) => setCategory(v)}
            multi={false}
          />
          <p className="partner-field-hint" style={{ marginTop: 8 }}>
            {lang === 'th'
              ? 'เลือกหมวดหมู่เพื่อดำเนินการต่อ'
              : 'Select a category to continue'}
          </p>
        </Card>
      )}

      {/* ── STEP 2: Flowers redirect ── */}
      {step === 2 && category === 'flowers' && (
        <Card style={{ textAlign: 'center', padding: '32px 24px' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>💐</div>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
            {lang === 'th'
              ? 'ช่อดอกไม้มีแบบฟอร์มแยก'
              : 'Flower bouquets have their own form'}
          </h2>
          <p
            style={{
              fontSize: 14,
              color: 'var(--text-muted)',
              marginBottom: 20,
            }}
          >
            {lang === 'th'
              ? 'ช่อดอกไม้ใช้ขนาด (S/M/L/XL) พร้อมราคาและรายละเอียดแต่ละขนาด'
              : 'Bouquets use size variants (S/M/L/XL) with individual pricing, prep times, and detailed descriptions per size.'}
          </p>
          <Btn onClick={() => setShowBouquetForm(true)}>
            {lang === 'th'
              ? 'ไปที่แบบฟอร์มช่อดอกไม้ →'
              : 'Continue to bouquet form →'}
          </Btn>
        </Card>
      )}

      {/* ── STEP 2: Product details ── */}
      {step === 2 && category !== 'flowers' && (
        <>
          {serverError && (
            <div className="partner-info-banner partner-info-banner--error">
              <span className="partner-info-banner-icon">⚠️</span>
              <span>{serverError}</span>
            </div>
          )}

          {/* Name */}
          <Card>
            <div className="partner-card-title">
              {lang === 'th' ? 'ชื่อสินค้า' : 'Product name'}
            </div>
            <Inp
              label={lang === 'th' ? 'ชื่อสินค้า (ภาษาอังกฤษ)' : 'Name (English)'}
              value={nameEn}
              onChange={(v) => {
                setNameEn(v);
                if (errors.nameEn) setErrors((p) => ({ ...p, nameEn: false }));
              }}
              placeholder={
                lang === 'th'
                  ? 'เช่น Scented Soy Candle'
                  : 'e.g. Scented Soy Candle'
              }
              required
            />
            {errors.nameEn && (
              <p className="partner-field-error">
                {lang === 'th'
                  ? 'กรุณาใส่ชื่อสินค้า'
                  : 'Please enter a product name'}
              </p>
            )}
            <Inp
              label={
                lang === 'th'
                  ? 'ชื่อสินค้า (ภาษาไทย)'
                  : 'ชื่อสินค้า (ภาษาไทย)'
              }
              sub={lang === 'th' ? 'ไม่บังคับ' : 'optional'}
              value={nameTh}
              onChange={setNameTh}
              placeholder={
                lang === 'th'
                  ? 'เช่น เทียนหอมถั่วเหลือง'
                  : 'เช่น เทียนหอมถั่วเหลือง'
              }
            />
          </Card>

          {/* Price & Prep */}
          <Card>
            <div className="partner-card-title">
              {lang === 'th' ? 'ราคา' : 'Pricing'}
            </div>
            <div className="partner-field-row">
              <div>
                <Inp
                  label={lang === 'th' ? 'ราคา (บาท)' : 'Price (THB)'}
                  type="number"
                  value={price}
                  onChange={(v) => {
                    setPrice(v);
                    if (errors.price) setErrors((p) => ({ ...p, price: false }));
                  }}
                  placeholder="0"
                  required
                />
                {errors.price && (
                  <p className="partner-field-error">
                    {lang === 'th'
                      ? 'กรุณาใส่ราคาที่ถูกต้อง'
                      : 'Enter a valid price'}
                  </p>
                )}
              </div>
              <Sel
                label={lang === 'th' ? 'เวลาเตรียม' : 'Prep time'}
                options={prepOptions}
                value={prepTime}
                onChange={setPrepTime}
              />
            </div>
          </Card>

          {/* Images */}
          <Card>
            <div className="partner-card-title">
              {lang === 'th' ? 'รูปภาพ' : 'Photos'}
              <span className="partner-card-title-hint">
                {imgCount}/{MAX_IMAGES}
              </span>
            </div>
            {/* Hidden file inputs — one per slot, outside the grid */}
            {imagePreviews.map((_, idx) => (
              <input
                key={`file-${idx}`}
                ref={(el) => {
                  fileInputRefs.current[idx] = el;
                }}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => handleFileChange(idx, e)}
              />
            ))}
            <div className="partner-image-grid">
              {imagePreviews.map((preview, idx) => {
                const allFull = imgCount >= MAX_IMAGES;
                const isDisabled = !preview && allFull;
                return (
                  <div
                    key={idx}
                    className={`partner-img-slot${preview ? ' has-image' : ''}${
                      isDisabled ? ' disabled' : ''
                    }${errors.images && idx === 0 && !preview ? ' error' : ''}`}
                    onClick={() => {
                      if (preview || isDisabled) return;
                      handleImageSelect(idx);
                    }}
                  >
                    {preview ? (
                      <>
                        <img src={preview} alt={`photo ${idx + 1}`} />
                        <button
                          type="button"
                          className="partner-img-remove"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveImage(idx);
                          }}
                          aria-label={lang === 'th' ? 'ลบ' : 'Remove'}
                        >
                          ✕
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="partner-img-slot-icon">
                          {isDisabled ? '—' : '+'}
                        </span>
                        <span className="partner-img-slot-label">
                          {isDisabled
                            ? lang === 'th'
                              ? 'เต็ม'
                              : 'Full'
                            : idx === 0
                              ? lang === 'th'
                                ? 'ปก'
                                : 'Cover'
                              : `${lang === 'th' ? 'รูป' : 'Photo'} ${idx + 1}`}
                        </span>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
            {imgCount >= MAX_IMAGES && (
              <div className="partner-info-banner" style={{ marginTop: 10 }}>
                <span className="partner-info-banner-icon">ℹ️</span>
                <span>
                  {lang === 'th'
                    ? 'ครบ 5 รูปแล้ว — ลบรูปเดิมก่อนเพิ่มรูปใหม่'
                    : 'Maximum 5 photos reached — remove one to add another.'}
                </span>
              </div>
            )}
            {imageError && (
              <p className="partner-field-error" style={{ marginTop: 8 }}>
                {imageError}
              </p>
            )}
            {errors.images && (
              <p className="partner-field-error" style={{ marginTop: 8 }}>
                {lang === 'th'
                  ? 'ต้องมีรูปภาพอย่างน้อย 1 รูป'
                  : 'At least one photo is required'}
              </p>
            )}
            <p className="partner-field-hint" style={{ marginTop: 10 }}>
              {lang === 'th'
                ? 'รูปแรกจะเป็นรูปปก รูปภาพที่ดีช่วยเพิ่มยอดขาย'
                : 'First photo will be the cover image. Good photos increase sales significantly.'}
            </p>
          </Card>

          {/* Occasions */}
          <Card>
            <div className="partner-card-title">
              {lang === 'th' ? 'โอกาส' : 'Occasions'}
              <span className="partner-card-title-hint">
                {lang === 'th'
                  ? 'ไม่บังคับ เลือกได้หลายรายการ'
                  : 'optional, select all that apply'}
              </span>
            </div>
            <Chips
              options={occasionOptions}
              selected={occasions}
              onToggle={toggleOccasion}
              multi
            />
          </Card>

          {/* Custom label */}
          <Card>
            <div className="partner-card-title">
              {lang === 'th' ? 'ป้ายกำกับ' : 'Custom label'}
              <span className="partner-card-title-hint">
                {lang === 'th' ? 'ไม่บังคับ' : 'optional'}
              </span>
            </div>
            <div className="partner-custom-tag-wrap">
              <input
                type="text"
                className="partner-custom-tag-input"
                value={customTag}
                onChange={(e) =>
                  setCustomTag(e.target.value.slice(0, 40))
                }
                maxLength={40}
                placeholder={
                  lang === 'th'
                    ? 'เช่น Organic, Handmade, แบรนด์ท้องถิ่น'
                    : 'e.g. Organic, Handmade, Local brand'
                }
              />
              <span className="partner-char-count">
                {customTag.length}/40
              </span>
            </div>
            <p className="partner-field-hint">
              {lang === 'th'
                ? 'ป้ายสั้นๆ ที่อธิบายว่าสินค้านี้พิเศษอย่างไร'
                : 'A short label that describes what makes this product special'}
            </p>
          </Card>

          {/* Optional description */}
          <Card>
            <button
              type="button"
              className={`partner-optional-toggle ${showDescription ? 'open' : ''}`}
              onClick={() => setShowDescription(!showDescription)}
            >
              <span className="partner-optional-toggle-arrow">▶</span>
              {lang === 'th'
                ? 'เพิ่มคำอธิบาย (ไม่บังคับ)'
                : 'Add description (optional)'}
            </button>
            {showDescription && (
              <div className="partner-optional-section">
                <div className="partner-inp">
                  <label>
                    {lang === 'th' ? 'คำอธิบาย (ภาษาอังกฤษ)' : 'Description (English)'}
                  </label>
                  <textarea
                    value={descriptionEn}
                    onChange={(e) => setDescriptionEn(e.target.value)}
                    placeholder={
                      lang === 'th'
                        ? 'อธิบายสินค้าของคุณ — วัสดุ, ขนาด, กลิ่น…'
                        : 'Describe your product — materials, size, scent, what makes it special…'
                    }
                    rows={3}
                  />
                </div>
                <div className="partner-inp">
                  <label>
                    {lang === 'th' ? 'คำอธิบาย (ภาษาไทย)' : 'คำอธิบาย (ภาษาไทย)'}
                  </label>
                  <textarea
                    value={descriptionTh}
                    onChange={(e) => setDescriptionTh(e.target.value)}
                    placeholder={
                      lang === 'th'
                        ? 'อธิบายสินค้าของคุณ…'
                        : 'อธิบายสินค้าของคุณ…'
                    }
                    rows={3}
                  />
                </div>
              </div>
            )}
          </Card>
        </>
      )}

      {/* ── STEP 3: Review ── */}
      {step === 3 && (
        <>
          <Card>
            <div className="partner-card-title">
              {lang === 'th' ? 'ตรวจสอบก่อนส่ง' : 'Review before submitting'}
            </div>
            <div className="partner-review-grid">
              <ReviewRow
                label={lang === 'th' ? 'หมวดหมู่' : 'Category'}
                value={categoryLabel}
              />
              <ReviewRow
                label={lang === 'th' ? 'ชื่อ' : 'Name'}
                value={
                  <>
                    <strong>{nameEn}</strong>
                    {nameTh && (
                      <>
                        <br />
                        <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>
                          {nameTh}
                        </span>
                      </>
                    )}
                  </>
                }
              />
              <ReviewRow
                label={lang === 'th' ? 'ราคา' : 'Price'}
                value={`฿${parseFloat(price).toLocaleString()}`}
                bold
              />
              <ReviewRow
                label={lang === 'th' ? 'เวลาเตรียม' : 'Prep time'}
                value={prepLabel}
              />
              <ReviewRow
                label={lang === 'th' ? 'รูปภาพ' : 'Photos'}
                value={
                  imgCount === 0
                    ? lang === 'th'
                      ? 'ไม่มีรูปภาพ'
                      : 'No photos added'
                    : `${imgCount} ${lang === 'th' ? 'รูป' : imgCount > 1 ? 'photos' : 'photo'}`
                }
                warn={imgCount === 0}
              />
              {occasionLabels && (
                <ReviewRow
                  label={lang === 'th' ? 'โอกาส' : 'Occasions'}
                  value={occasionLabels}
                />
              )}
              {customTag && (
                <ReviewRow
                  label={lang === 'th' ? 'ป้ายกำกับ' : 'Label'}
                  value={customTag}
                />
              )}
            </div>
          </Card>
          <p className="partner-field-hint" style={{ marginTop: 8, paddingLeft: 4 }}>
            {lang === 'th'
              ? 'คุณสามารถแก้ไขสินค้าได้หลังจากส่งจากหน้าสินค้า'
              : 'You can edit your product after submitting from the Products page.'}
          </p>
          {serverError && (
            <div
              className="partner-info-banner partner-info-banner--error"
              style={{ marginTop: 12 }}
            >
              <span className="partner-info-banner-icon">⚠️</span>
              <span>{serverError}</span>
            </div>
          )}
        </>
      )}

      {/* ── STEP 4: Success ── */}
      {step === 4 && (
        <div style={{ textAlign: 'center', padding: '48px 24px 24px' }}>
          <div className="partner-success-icon">✓</div>
          <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>
            {t.successTitle}
          </h2>
          <p
            style={{
              fontSize: 14,
              color: 'var(--text-muted)',
              marginBottom: 28,
            }}
          >
            {t.successSub}
          </p>
          <div
            style={{
              display: 'flex',
              gap: 10,
              justifyContent: 'center',
              flexWrap: 'wrap',
            }}
          >
            <Btn variant="ghost" onClick={handleAddAnother}>
              {lang === 'th' ? 'เพิ่มสินค้าอีก' : 'Add another product'}
            </Btn>
            <Link href={`/${lang}/partner/products`}>
              <Btn>
                {lang === 'th' ? 'ไปที่สินค้า →' : 'Go to products →'}
              </Btn>
            </Link>
          </div>
        </div>
      )}

      {/* ── Submit bar ── */}
      {step <= 3 && (
        <div className="partner-submit-bar">
          {backVisible && (
            <Btn variant="ghost" onClick={goBack}>
              {lang === 'th' ? '← กลับ' : '← Back'}
            </Btn>
          )}
          {nextVisible && (
            <Btn
              onClick={goNext}
              disabled={nextDisabled}
            >
              {nextLabel}
            </Btn>
          )}
        </div>
      )}
    </>
  );
}

function ReviewRow({
  label,
  value,
  bold,
  warn,
}: {
  label: string;
  value: React.ReactNode;
  bold?: boolean;
  warn?: boolean;
}) {
  return (
    <div className="partner-review-row">
      <span className="partner-review-label">{label}</span>
      <span
        className="partner-review-value"
        style={{
          fontWeight: bold ? 500 : undefined,
          color: warn ? 'var(--color-error, #C0392B)' : undefined,
        }}
      >
        {value}
      </span>
    </div>
  );
}
