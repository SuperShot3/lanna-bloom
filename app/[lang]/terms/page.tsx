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
    <div className="policy-page">
      <div className="container">
        <h1 className="policy-title">{isTh ? 'ข้อกำหนดการให้บริการ' : 'Terms of Service'}</h1>
        <p className="policy-intro">
          {isTh
            ? 'เอกสารนี้สรุปข้อกำหนดการใช้เว็บไซต์และการสั่งซื้อของ Lanna Bloom'
            : 'These terms summarize the conditions for using the Lanna Bloom website and placing orders.'}
        </p>

        <section className="policy-section">
          <h2 className="policy-heading">{isTh ? 'การสั่งซื้อและการยืนยัน' : 'Orders & confirmation'}</h2>
          <p className="policy-text">
            {isTh
              ? 'คำสั่งซื้ออาจต้องมีการยืนยันผ่านช่องทางแชท (LINE/WhatsApp) ก่อนการชำระเงินหรือการจัดส่ง'
              : 'Orders may require confirmation via chat (LINE/WhatsApp) before payment or delivery.'}
          </p>
        </section>

        <section className="policy-section">
          <h2 className="policy-heading">{isTh ? 'สกุลเงินและการชำระเงิน' : 'Currency and payment'}</h2>
          <p className="policy-text">
            {isTh
              ? 'ราคาสินค้า การจัดส่ง และการชำระเงินทั้งหมดกำหนดและเรียกเก็บเป็นเงินบาท (THB) หากเว็บไซต์แสดงสกุลเงินอื่น ยอดดังกล่าวเป็นเพียงประมาณการเพื่อความสะดวกเท่านั้น ธนาคารหรือผู้ออกบัตรเป็นผู้กำหนดอัตราแลกเปลี่ยนสุดท้ายและอาจเรียกเก็บค่าธรรมเนียมการทำรายการต่างประเทศ'
              : 'All product, delivery, and payment prices are set and charged in Thai baht (THB). Any other currency shown on the website is an estimate for convenience only. Your bank or card issuer determines the final exchange rate and may charge a foreign-transaction fee.'}
          </p>
        </section>

        <section className="policy-section">
          <h2 className="policy-heading">{isTh ? 'การคืนเงิน/เปลี่ยนสินค้า' : 'Refunds / replacements'}</h2>
          <p className="policy-text">
            {isTh ? (
              <>
                โปรดดูรายละเอียดในหน้า{' '}
                <Link href={`/${locale}/refund-replacement`} className="policy-link-inline">
                  นโยบายคืนเงิน / เปลี่ยนสินค้า
                </Link>
                .
              </>
            ) : (
              <>
                Please see our{' '}
                <Link href={`/${locale}/refund-replacement`} className="policy-link-inline">
                  Refund / Replacement Policy
                </Link>
                .
              </>
            )}
          </p>
        </section>

        <section className="policy-section">
          <h2 className="policy-heading">{isTh ? 'ความเป็นส่วนตัว' : 'Privacy'}</h2>
          <p className="policy-text">
            {isTh ? (
              <>
                ดู{' '}
                <Link href={`/${locale}/privacy`} className="policy-link-inline">
                  นโยบายความเป็นส่วนตัว
                </Link>{' '}
                และ{' '}
                <Link href={`/${locale}/cookies`} className="policy-link-inline">
                  นโยบายคุกกี้
                </Link>
                .
              </>
            ) : (
              <>
                See our{' '}
                <Link href={`/${locale}/privacy`} className="policy-link-inline">
                  Privacy Policy
                </Link>{' '}
                and{' '}
                <Link href={`/${locale}/cookies`} className="policy-link-inline">
                  Cookie Policy
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
