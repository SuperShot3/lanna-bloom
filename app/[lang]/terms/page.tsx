import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { isValidLocale, type Locale } from '@/lib/i18n';

export async function generateMetadata({ params }: { params: { lang: string } }): Promise<Metadata> {
  if (!isValidLocale(params.lang)) return { title: 'Terms of Service' };
  const lang = params.lang as Locale;
  return { title: lang === 'th' ? 'ข้อกำหนดการให้บริการ | Lanna Bloom' : 'Terms of Service | Lanna Bloom' };
}

export default function TermsPage({ params }: { params: { lang: string } }) {
  const { lang } = params;
  if (!isValidLocale(lang)) notFound();
  const locale = lang as Locale;
  const isTh = locale === 'th';

  return (
    <div className="container py-10">
      <h1 className="text-3xl font-extrabold text-stone-900 mb-4">{isTh ? 'ข้อกำหนดการให้บริการ' : 'Terms of Service'}</h1>
      <div className="prose prose-stone max-w-none">
        <p>
          {isTh
            ? 'เอกสารนี้สรุปข้อกำหนดการใช้เว็บไซต์และการสั่งซื้อของ Lanna Bloom'
            : 'These terms summarize the conditions for using the Lanna Bloom website and placing orders.'}
        </p>
        <h2>{isTh ? 'การสั่งซื้อและการยืนยัน' : 'Orders & confirmation'}</h2>
        <p>
          {isTh
            ? 'คำสั่งซื้ออาจต้องมีการยืนยันผ่านช่องทางแชท (LINE/WhatsApp) ก่อนการชำระเงินหรือการจัดส่ง'
            : 'Orders may require confirmation via chat (LINE/WhatsApp) before payment or delivery.'}
        </p>
        <h2>{isTh ? 'การคืนเงิน/เปลี่ยนสินค้า' : 'Refunds / replacements'}</h2>
        <p>
          {isTh ? (
            <>
              โปรดดูรายละเอียดในหน้า <Link href={`/${locale}/refund-replacement`}>นโยบายคืนเงิน / เปลี่ยนสินค้า</Link>.
            </>
          ) : (
            <>
              Please see our <Link href={`/${locale}/refund-replacement`}>Refund / Replacement Policy</Link>.
            </>
          )}
        </p>
        <h2>{isTh ? 'ความเป็นส่วนตัว' : 'Privacy'}</h2>
        <p>
          {isTh ? (
            <>
              ดู <Link href={`/${locale}/privacy`}>นโยบายความเป็นส่วนตัว</Link> และ <Link href={`/${locale}/cookies`}>นโยบายคุกกี้</Link>.
            </>
          ) : (
            <>
              See our <Link href={`/${locale}/privacy`}>Privacy Policy</Link> and <Link href={`/${locale}/cookies`}>Cookie Policy</Link>.
            </>
          )}
        </p>
      </div>
    </div>
  );
}

