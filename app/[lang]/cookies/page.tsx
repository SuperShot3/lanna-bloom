import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { isValidLocale, type Locale } from '@/lib/i18n';

export async function generateMetadata({ params }: { params: { lang: string } }): Promise<Metadata> {
  if (!isValidLocale(params.lang)) return { title: 'Cookie Policy' };
  const lang = params.lang as Locale;
  return { title: lang === 'th' ? 'นโยบายคุกกี้ | Lanna Bloom' : 'Cookie Policy | Lanna Bloom' };
}

export default function CookiePolicyPage({ params }: { params: { lang: string } }) {
  const { lang } = params;
  if (!isValidLocale(lang)) notFound();
  const locale = lang as Locale;
  const isTh = locale === 'th';

  return (
    <div className="container py-10">
      <h1 className="text-3xl font-extrabold text-stone-900 mb-4">{isTh ? 'นโยบายคุกกี้' : 'Cookie Policy'}</h1>
      <div className="prose prose-stone max-w-none">
        <p>
          {isTh
            ? 'หน้านี้อธิบายว่าเว็บไซต์ใช้คุกกี้และการจัดเก็บข้อมูลบนอุปกรณ์ (เช่น localStorage) อย่างไร และคุณสามารถจัดการการตั้งค่าได้อย่างไร'
            : 'This page explains how we use cookies and device storage (such as localStorage) and how you can control your preferences.'}
        </p>

        <h2>{isTh ? 'ประเภทของคุกกี้' : 'Cookie categories'}</h2>
        <ul>
          <li>
            <strong>{isTh ? 'จำเป็น (Essential)' : 'Essential'}</strong> —{' '}
            {isTh
              ? 'จำเป็นต่อการทำงานหลักของเว็บไซต์ เช่น ความปลอดภัย เซสชัน และการใช้งานตะกร้า'
              : 'Required for core site functionality such as security, sessions, and cart usage.'}
          </li>
          <li>
            <strong>{isTh ? 'วิเคราะห์ (Analytics)' : 'Analytics'}</strong> —{' '}
            {isTh
              ? 'ช่วยให้เราเข้าใจการใช้งานเว็บไซต์ (เช่น ผ่าน Google Analytics 4 ผ่าน Google Tag Manager) เปิดใช้งานเฉพาะเมื่อคุณยินยอม'
              : 'Helps us understand website usage (e.g. Google Analytics 4 via Google Tag Manager). Enabled only with your consent.'}
          </li>
          <li>
            <strong>{isTh ? 'การตลาด (Marketing)' : 'Marketing'}</strong> —{' '}
            {isTh
              ? 'ใช้เพื่อวัดผลโฆษณาและการทำรีมาร์เก็ตติ้ง (เช่น Google Ads ผ่าน Google Tag Manager) เปิดใช้งานเฉพาะเมื่อคุณยินยอม'
              : 'Used for ads measurement and remarketing (e.g. Google Ads via Google Tag Manager). Enabled only with your consent.'}
          </li>
        </ul>

        <h2>{isTh ? 'สิ่งที่เราใช้บนเว็บไซต์นี้' : 'What we use on this site'}</h2>
        <ul>
          <li>
            {isTh ? 'Google Tag Manager (GTM) — โหลดเฉพาะหลังจากที่คุณยินยอม (Analytics/Marketing)' : 'Google Tag Manager (GTM) — loaded only after you consent (Analytics/Marketing).'}
          </li>
          <li>
            {isTh
              ? 'Google Consent Mode v2 — ตั้งค่าเริ่มต้นเป็น “ปฏิเสธ” และอัปเดตตามตัวเลือกของคุณ'
              : 'Google Consent Mode v2 — defaults to “denied” and updates based on your choices.'}
          </li>
          <li>
            {isTh
              ? 'การจัดเก็บตะกร้าใน localStorage (จำเป็นต่อการใช้งาน)'
              : 'Cart storage in localStorage (essential for functionality).'}
          </li>
        </ul>

        <h2>{isTh ? 'จัดการการตั้งค่า' : 'Manage your preferences'}</h2>
        <p>
          {isTh ? (
            <>
              คุณสามารถเปลี่ยนการตั้งค่าคุกกี้ได้ตลอดเวลาโดยคลิก “Cookie settings” ที่ด้านล่างของหน้า หรืออ่านเพิ่มเติมใน{' '}
              <Link href={`/${locale}/privacy`}>นโยบายความเป็นส่วนตัว</Link>.
            </>
          ) : (
            <>
              You can change your cookie preferences anytime by clicking “Cookie settings” in the footer. For more details, see our{' '}
              <Link href={`/${locale}/privacy`}>Privacy Policy</Link>.
            </>
          )}
        </p>
      </div>
    </div>
  );
}

