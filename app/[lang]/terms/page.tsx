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
              ? 'การสั่งซื้อและการชำระเงินทำผ่านเว็บไซต์ของเรา หลังชำระเงินสำเร็จ ระบบอัตโนมัติจะดำเนินการตามคำสั่งซื้อ เราไม่ยืนยันคำสั่งซื้อผ่านแชท (LINE, WhatsApp, Telegram หรือช่องทางที่คล้ายกัน)'
              : 'Orders are placed and paid on our website. After successful payment, our automated system processes your order. We do not confirm orders by chat (LINE, WhatsApp, Telegram, or similar).'}
          </p>
          <p className="policy-text">
            {isTh
              ? 'อีเมลเป็นข้อมูลทางเลือก หากคุณให้อีเมลตอนชำระเงิน ระบบจะส่งอีเมลอัตโนมัติ เช่น การยืนยันคำสั่งซื้อและการแจ้งเมื่อจัดส่งแล้ว หากคุณไม่ให้อีเมล คุณจะไม่ได้รับอีเมลจากระบบ คุณยังสามารถติดตามสถานะคำสั่งซื้อได้ในหน้าตะกร้าสินค้า โดยกรอกเบอร์โทรศัพท์ที่ใช้ตอนสั่งซื้อ'
              : 'Email is optional. If you provide an email at checkout, our system sends automated emails such as order confirmation and order delivered notices. If you do not provide an email, you will not receive system emails. You can still track your order on the cart page by entering the phone number used at checkout.'}
          </p>
          <p className="policy-text">
            {isTh
              ? 'เราจะติดต่อคุณเฉพาะเมื่อข้อมูลที่จำเป็นไม่ครบหรือไม่ชัดเจน โดยใช้ช่องทางที่คุณเลือกตอนชำระเงิน หากรายละเอียดคำสั่งซื้อครบถ้วนและชัดเจนแล้ว เราจะไม่ติดต่อเพื่อยืนยันคำสั่งซื้ออีก'
              : 'We contact you only if required information is missing or unclear, using the communication method you chose at checkout. If your order details are complete and clear, we will not contact you for confirmation.'}
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
