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
    <div className="policy-page">
      <div className="container">
        <h1 className="policy-title">{isTh ? 'นโยบายคุกกี้' : 'Cookie Policy'}</h1>
        <p className="policy-intro">
          {isTh
            ? 'หน้านี้อธิบายว่าเว็บไซต์ใช้คุกกี้และการจัดเก็บข้อมูลบนอุปกรณ์ (เช่น localStorage) อย่างไร เพื่อให้เว็บไซต์ทำงาน วิเคราะห์การใช้งาน ปรับปรุงการสั่งซื้อ และวัดผลการตลาด'
            : 'This page explains how we use cookies and device storage (such as localStorage) to run the website, understand usage, improve ordering, and measure marketing.'}
        </p>

        <section className="policy-section">
          <h2 className="policy-heading">{isTh ? 'ประเภทของคุกกี้' : 'Cookie categories'}</h2>
          <ul className="policy-list">
            <li>
              <strong>{isTh ? 'จำเป็น (Essential)' : 'Essential'}</strong> —{' '}
              {isTh
                ? 'จำเป็นต่อการทำงานหลักของเว็บไซต์ เช่น ความปลอดภัย เซสชัน และการใช้งานตะกร้า'
                : 'Required for core site functionality such as security, sessions, and cart usage.'}
            </li>
            <li>
              <strong>{isTh ? 'วิเคราะห์ (Analytics)' : 'Analytics'}</strong> —{' '}
              {isTh
                ? 'ช่วยให้เราเข้าใจการใช้งานเว็บไซต์ เช่น หน้าใดมีผู้เข้าชม การคลิก และขั้นตอนที่ลูกค้าออกจากการสั่งซื้อ (เช่น ผ่าน Google Analytics 4 ผ่าน Google Tag Manager)'
                : 'Helps us understand website usage, such as visited pages, clicks, and where customers leave the ordering flow (e.g. Google Analytics 4 via Google Tag Manager).'}
            </li>
            <li>
              <strong>{isTh ? 'การตลาด (Marketing)' : 'Marketing'}</strong> —{' '}
              {isTh
                ? 'ใช้เพื่อวัดผลโฆษณาและการตลาด (เช่น Google Ads ผ่าน Google Tag Manager) เพื่อช่วยให้เราเข้าใจว่าแคมเปญใดนำไปสู่การสั่งซื้อ'
                : 'Used for ads and marketing measurement (e.g. Google Ads via Google Tag Manager) so we can understand which campaigns lead to orders.'}
            </li>
          </ul>
        </section>

        <section className="policy-section">
          <h2 className="policy-heading">{isTh ? 'สิ่งที่เราใช้บนเว็บไซต์นี้' : 'What we use on this site'}</h2>
          <ul className="policy-list">
            <li>
              {isTh
                ? 'Google Tag Manager (GTM) — ใช้สำหรับโหลดและจัดการเครื่องมือวิเคราะห์/การตลาด'
                : 'Google Tag Manager (GTM) — used to load and manage analytics/marketing measurement.'}
            </li>
            <li>
              {isTh
                ? 'Google Consent Mode v2 — ตั้งค่าเริ่มต้นให้รองรับการวิเคราะห์และการวัดผลโฆษณาตามประกาศคุกกี้นี้'
                : 'Google Consent Mode v2 — defaults to support analytics and ads measurement under this cookie notice.'}
            </li>
            <li>
              {isTh
                ? 'Microsoft Clarity — ใช้เพื่อดูฮีตแมปและการบันทึกเซสชันแบบไม่แสดงรหัสผ่านหรือข้อมูลบัตร เพื่อช่วยปรับปรุงประสบการณ์การสั่งซื้อ'
                : 'Microsoft Clarity — used for heatmaps and session recordings without passwords or card details, helping us improve the ordering experience.'}
            </li>
            <li>
              {isTh
                ? 'การจัดเก็บตะกร้าใน localStorage (จำเป็นต่อการใช้งาน)'
                : 'Cart storage in localStorage (essential for functionality).'}
            </li>
          </ul>
        </section>

        <section className="policy-section">
          <h2 className="policy-heading">{isTh ? 'ประกาศคุกกี้' : 'Cookie notice'}</h2>
          <p className="policy-text">
            {isTh ? (
              <>
                เมื่อคุณเข้าเว็บไซต์ เราจะแสดงประกาศคุกกี้ที่ด้านล่างของหน้า การใช้งานเว็บไซต์ต่อไปหรือกด OK
                ถือว่าคุณรับทราบการใช้งานคุกกี้และเครื่องมือวิเคราะห์ตามที่อธิบายในหน้านี้
                หากต้องการเห็นประกาศอีกครั้ง ให้ลบคุกกี้ <code>cookie_consent</code> ในเบราว์เซอร์แล้วโหลดหน้าใหม่
                อ่านเพิ่มเติมใน{' '}
                <Link href={`/${locale}/privacy`} className="policy-link-inline">
                  นโยบายความเป็นส่วนตัว
                </Link>
                .
              </>
            ) : (
              <>
                We show a cookie notice at the bottom of the page when you first visit. By continuing to use the site
                or clicking OK, you acknowledge our use of cookies and analytics as described here. To see the notice
                again, clear the <code>cookie_consent</code> cookie in your browser and reload. For more details, see
                our{' '}
                <Link href={`/${locale}/privacy`} className="policy-link-inline">
                  Privacy Policy
                </Link>
                .
              </>
            )}
          </p>
        </section>
      </div>
    </div>
  );
}
