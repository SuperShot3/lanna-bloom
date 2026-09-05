import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { isValidLocale, type Locale } from '@/lib/i18n';
import '../policy.css';

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
              ? 'การสั่งซื้อและการชำระเงินทำผ่านเว็บไซต์ของเราโดยตรง เมื่อชำระเงินสำเร็จ คำสั่งซื้อจะถูกรับและดำเนินการโดยระบบอัตโนมัติ'
              : 'Orders are placed and paid directly through our website. Once payment is successful, your order is automatically received and processed by our system.'}
          </p>
          <p className="policy-text">
            {isTh
              ? 'คุณสามารถติดต่อเราได้ตลอดเวลาทาง LINE, WhatsApp, Telegram, อีเมล หรือแชทในหน้าออเดอร์ อย่างไรก็ตาม การติดต่อเราไม่จำเป็นเพื่อยืนยันคำสั่งซื้อ หากชำระเงินสำเร็จและรายละเอียดคำสั่งซื้อครบถ้วน ระบบจะดำเนินการตามคำสั่งซื้อโดยอัตโนมัติ'
              : 'You are always welcome to contact us by LINE, WhatsApp, Telegram, email, or order chat. However, contacting us is not required to confirm your order. If payment is successful and the order details are complete, your order will be processed automatically.'}
          </p>
          <p className="policy-text">
            {isTh
              ? 'อีเมลเป็นข้อมูลทางเลือก หากคุณให้อีเมลตอนชำระเงิน ระบบจะส่งการอัปเดตอัตโนมัติ เช่น การยืนยันคำสั่งซื้อและการแจ้งเมื่อจัดส่งแล้ว หากคุณไม่ให้อีเมล คุณยังสามารถเข้าถึงและติดตามคำสั่งซื้อได้โดยใช้เบอร์โทรศัพท์ที่กรอกตอนชำระเงิน'
              : 'Email is optional. If you provide an email address at checkout, our system will send automated updates such as order confirmation and delivery notifications. If you do not provide an email, you can still access and track your order using the phone number entered at checkout.'}
          </p>
          <p className="policy-text">
            {isTh
              ? 'หากข้อมูลใดขาดหายหรือไม่ชัดเจน เราจะติดต่อคุณผ่านช่องทางที่คุณเลือกตอนชำระเงิน'
              : 'If any information is missing or unclear, we will contact you using the communication method you selected at checkout.'}
          </p>
          <p className="policy-text">
            {isTh
              ? 'หากมีคำถาม คำขอพิเศษ หรือต้องการชี้แจงอะไรหลังสั่งซื้อ สามารถติดต่อเราได้ตามสะดวก — ผ่านแชทในหน้าออเดอร์, WhatsApp, LINE, Telegram หรืออีเมล'
              : 'If you have any questions, special requests, or would like to clarify something after placing your order, please feel free to contact us in whichever way is most convenient for you — through the order chat, WhatsApp, LINE, Telegram, or email.'}
          </p>
        </section>

        <section className="policy-section">
          <h2 className="policy-heading">{isTh ? 'แชทชั่วคราวในหน้าออเดอร์' : 'Temporary order-page chat'}</h2>
          <p className="policy-text">
            {isTh
              ? 'เมื่อเปิดใช้งาน คุณอาจใช้แชทชั่วคราวในหน้าติดตามออเดอร์ (ลิงก์ที่มีโทเค็นส่วนตัว) เพื่อติดต่อทีม Lanna Bloom เกี่ยวกับรายละเอียดจัดส่ง การประสานงาน หรือปัญหาหลังจัดส่ง แชทนี้เป็นช่องทางสำรอง ไม่ใช่ช่องทางสั่งซื้อหรือยืนยันการชำระเงิน และไม่ได้เข้ารหัสแบบต้นทางถึงปลายทาง'
              : 'When enabled, you may use a temporary chat on your order tracking page (the private token link) to reach the Lanna Bloom team about delivery details, coordination, or post-delivery issues. This chat is a support backup channel. It is not used to place orders or confirm payment, and it is not end-to-end encrypted.'}
          </p>
          <p className="policy-text">
            {isTh
              ? 'ประวัติข้อความจะถูกลบถาวรภายใน 2 ชั่วโมงหลังออเดอร์ถูกทำเครื่องหมายว่าจัดส่งแล้ว ซึ่งสอดคล้องกับช่วงเวลาแจ้งปัญหาในนโยบายคืนเงิน/เปลี่ยนสินค้า หลังลบแล้วจะไม่สามารถกู้คืนข้อความได้ LINE, WhatsApp และโทรศัพท์ยังคงเป็นช่องทางติดต่อหลักตามปกติ'
              : 'Message history is permanently deleted 2 hours after the order is marked delivered, matching the issue-reporting window in our refund and replacement policy. After deletion, messages cannot be recovered. LINE, WhatsApp, and phone remain available as usual contact channels.'}
          </p>
          <p className="policy-text">
            {isTh ? (
              <>
                รายละเอียดเพิ่มเติมเกี่ยวกับข้อมูลส่วนบุคคลในแชทนี้ดูได้ใน{' '}
                <Link href={`/${locale}/privacy`} className="policy-link-inline">
                  นโยบายความเป็นส่วนตัว
                </Link>
                .
              </>
            ) : (
              <>
                More detail on how chat messages are handled is in our{' '}
                <Link href={`/${locale}/privacy`} className="policy-link-inline">
                  Privacy Policy
                </Link>
                .
              </>
            )}
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

        <section className="policy-section" id="destination-item-pricing">
          <h2 className="policy-heading">{isTh ? 'ราคาสินค้าตามปลายทางจัดส่ง' : 'Destination item pricing'}</h2>
          <p className="policy-text">
            {isTh
              ? 'ราคาช่อและสินค้าในบางปลายทางอาจสูงกว่าราคาแคตตาล็อกเชียงใหม่ ยอดที่แสดงในแคตตาล็อก ตะกร้า และหน้าเช็กเอาต์สำหรับปลายทางนั้นรวมส่วนปรับนี้แล้ว ค่าจัดส่งคิดแยกและไม่อยู่ในส่วนปรับนี้'
              : 'Bouquet and item prices can be higher in some delivery destinations than the Chiang Mai catalog. The amount shown on the catalog, cart, and checkout for that destination already includes this adjustment. Delivery fees are charged separately and are not part of this markup.'}
          </p>
          <ul className="policy-list">
            <li>
              {isTh
                ? 'ภูเก็ต เกาะสมุย และกระบี่ / อ่าวนาง: ราคาสินค้าสูงกว่าราคาแคตตาล็อกเชียงใหม่ 30% ปัดเป็นจำนวนใกล้เคียง 10 บาท'
                : 'Phuket, Koh Samui, and Krabi / Ao Nang: item prices are 30% higher than the Chiang Mai catalog, rounded to the nearest 10 THB.'}
            </li>
            <li>
              {isTh
                ? 'กรุงเทพฯ และปาย: ราคาสินค้าสูงกว่าราคาแคตตาล็อกเชียงใหม่ 20% ปัดเป็นจำนวนใกล้เคียง 10 บาท'
                : 'Bangkok and Pai: item prices are 20% higher than the Chiang Mai catalog, rounded to the nearest 10 THB.'}
            </li>
          </ul>
          <p className="policy-text">
            {isTh ? (
              <>
                ราคาช่วงเทศกาลสำคัญอาจใช้ซ้อนกับราคาตามปลายทาง เมื่อทั้งวันสั่งและวันจัดส่งอยู่ในช่วงพีก ดูวันที่และอัตราใน{' '}
                <Link href={`/${locale}/info/delivery-policy#peak-celebration-pricing`} className="policy-link-inline">
                  นโยบายจัดส่ง
                </Link>
                .
              </>
            ) : (
              <>
                Peak celebration pricing may apply on top of destination item prices when both the order date and
                delivery date fall in a peak window. See the{' '}
                <Link href={`/${locale}/info/delivery-policy#peak-celebration-pricing`} className="policy-link-inline">
                  Delivery Policy
                </Link>{' '}
                for peak dates and rates.
              </>
            )}
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
