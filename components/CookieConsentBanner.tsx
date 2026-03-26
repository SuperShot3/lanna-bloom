'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useCookieConsent } from '@/contexts/CookieConsentContext';
import styles from './cookieConsentBanner.module.css';

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className={styles.toggleRow}>
      <span className={styles.toggleText}>
        <span className={styles.toggleLabel}>{label}</span>
        <span className={styles.toggleDescription}>{description}</span>
      </span>
      <input
        type="checkbox"
        className={styles.toggleInput}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        aria-label={label}
      />
    </label>
  );
}

export function CookieConsentBanner({ lang }: { lang: 'en' | 'th' }) {
  const {
    hasChoice,
    consent,
    isPreferencesOpen,
    openPreferences,
    closePreferences,
    acceptAll,
    rejectNonEssential,
    savePreferences,
  } = useCookieConsent();

  const t = useMemo(() => {
    if (lang === 'th') {
      return {
        title: 'คุกกี้และการติดตาม',
        body:
          'เราใช้คุกกี้ที่จำเป็นเพื่อให้เว็บไซต์ทำงานได้ และใช้คุกกี้/การติดตามเพิ่มเติมเพื่อวิเคราะห์และการตลาดเมื่อคุณอนุญาต',
        acceptAll: 'ยอมรับทั้งหมด',
        reject: 'ปฏิเสธที่ไม่จำเป็น',
        manage: 'จัดการการตั้งค่า',
        save: 'บันทึกการตั้งค่า',
        close: 'ปิด',
        essential: 'จำเป็นเสมอ',
        essentialDesc: 'ใช้เพื่อความปลอดภัยและการทำงานหลัก (เช่น ตะกร้า/เซสชัน)',
        analytics: 'วิเคราะห์ (Analytics)',
        analyticsDesc: 'ช่วยให้เราเข้าใจการใช้งานและปรับปรุงเว็บไซต์ (เช่น GA4 ผ่าน GTM)',
        marketing: 'การตลาด (Marketing)',
        marketingDesc: 'ใช้สำหรับการวัดผลโฆษณา/การทำรีมาร์เก็ตติ้ง (เช่น Google Ads ผ่าน GTM)',
        cookiePolicy: 'นโยบายคุกกี้',
        privacyPolicy: 'นโยบายความเป็นส่วนตัว',
      };
    }
    return {
      title: 'Cookies & tracking',
      body:
        'We use essential cookies to make the site work. With your permission, we also use additional cookies/measurement for analytics and marketing.',
      acceptAll: 'Accept all',
      reject: 'Reject non-essential',
      manage: 'Manage preferences',
      save: 'Save preferences',
      close: 'Close',
      essential: 'Always on',
      essentialDesc: 'Used for security and core functionality (e.g. cart/session).',
      analytics: 'Analytics',
      analyticsDesc: 'Helps us understand usage and improve the site (e.g. GA4 via GTM).',
      marketing: 'Marketing',
      marketingDesc: 'Used for ads measurement/remarketing (e.g. Google Ads via GTM).',
      cookiePolicy: 'Cookie Policy',
      privacyPolicy: 'Privacy Policy',
    };
  }, [lang]);

  const [draftAnalytics, setDraftAnalytics] = useState(consent.a);
  const [draftMarketing, setDraftMarketing] = useState(consent.m);

  // Keep draft in sync when opening preferences and after saving elsewhere.
  useEffect(() => {
    if (!isPreferencesOpen) return;
    setDraftAnalytics(consent.a);
    setDraftMarketing(consent.m);
  }, [isPreferencesOpen, consent.a, consent.m]);

  const showBanner = !hasChoice;

  return (
    <>
      {showBanner && (
        <div className={styles.banner} role="region" aria-label={t.title}>
          <div className={styles.bannerInner}>
            <div className={styles.bannerText}>
              <div className={styles.bannerTitle}>{t.title}</div>
              <div className={styles.bannerBody}>{t.body}</div>
              <div className={styles.bannerLinks}>
                <Link href={`/${lang}/cookies`} className={styles.link}>
                  {t.cookiePolicy}
                </Link>
                <span className={styles.dot}>•</span>
                <Link href={`/${lang}/privacy`} className={styles.link}>
                  {t.privacyPolicy}
                </Link>
              </div>
            </div>
            <div className={styles.bannerActions}>
              <button className={styles.secondaryBtn} onClick={rejectNonEssential} type="button">
                {t.reject}
              </button>
              <button className={styles.secondaryBtn} onClick={openPreferences} type="button">
                {t.manage}
              </button>
              <button className={styles.primaryBtn} onClick={acceptAll} type="button">
                {t.acceptAll}
              </button>
            </div>
          </div>
        </div>
      )}

      {isPreferencesOpen && (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true" aria-label={t.manage}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitle}>{t.manage}</div>
              <button className={styles.iconBtn} onClick={closePreferences} type="button" aria-label={t.close}>
                ×
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.section}>
                <div className={styles.sectionTitle}>{t.essential}</div>
                <div className={styles.sectionNote}>{t.essentialDesc}</div>
              </div>

              <div className={styles.section}>
                <ToggleRow
                  label={t.analytics}
                  description={t.analyticsDesc}
                  checked={draftAnalytics}
                  onChange={setDraftAnalytics}
                />
                <ToggleRow
                  label={t.marketing}
                  description={t.marketingDesc}
                  checked={draftMarketing}
                  onChange={setDraftMarketing}
                />
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button className={styles.secondaryBtn} onClick={rejectNonEssential} type="button">
                {t.reject}
              </button>
              <button
                className={styles.primaryBtn}
                onClick={() => savePreferences({ analytics: draftAnalytics, marketing: draftMarketing })}
                type="button"
              >
                {t.save}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

