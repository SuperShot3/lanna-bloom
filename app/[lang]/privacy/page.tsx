import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { isValidLocale, type Locale } from '@/lib/i18n';

export async function generateMetadata({ params }: { params: { lang: string } }): Promise<Metadata> {
  if (!isValidLocale(params.lang)) return { title: 'Privacy Policy' };
  const lang = params.lang as Locale;
  return { title: lang === 'th' ? 'นโยบายความเป็นส่วนตัว | Lanna Bloom' : 'Privacy Policy | Lanna Bloom' };
}

export default function PrivacyPage({ params }: { params: { lang: string } }) {
  const { lang } = params;
  if (!isValidLocale(lang)) notFound();
  const locale = lang as Locale;

  const isTh = locale === 'th';
  const h1 = isTh ? 'นโยบายความเป็นส่วนตัว' : 'Privacy Policy';

  return (
    <div className="container py-10">
      <h1 className="text-3xl font-extrabold text-stone-900 mb-4">{h1}</h1>
      <div className="prose prose-stone max-w-none">
        <p>
          {isTh
            ? 'เอกสารนี้อธิบายว่า Lanna Bloom เก็บ ใช้ และเปิดเผยข้อมูลส่วนบุคคลอย่างไรเมื่อคุณใช้งานเว็บไซต์และทำรายการสั่งซื้อ'
            : 'This policy explains how Lanna Bloom collects, uses, and shares personal data when you use our website and place orders.'}
        </p>

        <h2>{isTh ? 'ข้อมูลที่เราเก็บ' : 'Data we collect'}</h2>
        <ul>
          <li>{isTh ? 'ข้อมูลการติดต่อและการจัดส่ง (ชื่อ เบอร์โทร ที่อยู่ ข้อความการ์ด ฯลฯ)' : 'Contact and delivery details (name, phone, address, card message, etc.).'}</li>
          <li>{isTh ? 'ข้อมูลการสั่งซื้อและการชำระเงิน (ผ่านผู้ให้บริการชำระเงิน เช่น Stripe เมื่อมีการชำระด้วยบัตร)' : 'Order and payment data (via payment providers such as Stripe when paying by card).'}</li>
          <li>{isTh ? 'ข้อมูลการใช้งานเว็บไซต์ (เมื่อคุณยินยอมคุกกี้วิเคราะห์/การตลาด)' : 'Website usage data (only when you consent to analytics/marketing cookies).'}</li>
        </ul>

        <h2>{isTh ? 'คุกกี้และการวัดผล' : 'Cookies & measurement'}</h2>
        <p>
          {isTh ? (
            <>
              เราใช้คุกกี้ที่จำเป็นเพื่อให้เว็บไซต์ทำงานได้ และใช้คุกกี้/การวัดผลเพิ่มเติมเมื่อคุณยินยอม ดูรายละเอียดใน{' '}
              <Link href={`/${locale}/cookies`}>นโยบายคุกกี้</Link>.
            </>
          ) : (
            <>
              We use essential cookies to make the site work and only use additional analytics/marketing measurement when you consent. See our{' '}
              <Link href={`/${locale}/cookies`}>Cookie Policy</Link>.
            </>
          )}
        </p>

        <h2>{isTh ? 'การแบ่งปันข้อมูล' : 'Sharing'}</h2>
        <p>
          {isTh
            ? 'เราอาจแบ่งปันข้อมูลกับผู้ให้บริการที่จำเป็นต่อการให้บริการ เช่น ผู้ให้บริการชำระเงิน โฮสติ้ง อีเมล และระบบจัดการคำสั่งซื้อ'
            : 'We may share data with service providers necessary to operate the service, such as payment, hosting, email, and order management providers.'}
        </p>

        <h2>{isTh ? 'การติดต่อ' : 'Contact'}</h2>
        <p>
          {isTh
            ? 'หากมีคำถามเกี่ยวกับนโยบายนี้ กรุณาติดต่อเราผ่านหน้า Contact'
            : 'If you have questions about this policy, please contact us via our Contact page.'}{' '}
          <Link href={`/${locale}/contact`}>{isTh ? 'ติดต่อเรา' : 'Contact'}</Link>.
        </p>
      </div>
    </div>
  );
}

