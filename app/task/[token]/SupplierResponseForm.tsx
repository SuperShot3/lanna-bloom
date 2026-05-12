'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import type {
  SupplierMessageCardSnapshot,
  SupplierPreparationSnapshot,
  SupplierProductSnapshot,
  SupplierResponseType,
} from '@/lib/supplierRequests';

interface SupplierResponseFormProps {
  token: string;
  product: SupplierProductSnapshot;
  preparation: SupplierPreparationSnapshot;
  messageCard: SupplierMessageCardSnapshot;
}

const RESPONSE_OPTIONS: Array<{ value: SupplierResponseType; title: string; helper: string }> = [
  {
    value: 'PREPARE',
    title: 'รับทำตามรายละเอียด',
    helper: 'ราคาและเวลาพร้อมตามที่แจ้งได้',
  },
  {
    value: 'PREPARE_WITH_CHANGES',
    title: 'รับทำได้ แต่มีรายละเอียดต้องปรับ',
    helper: 'เช่น สี ดอกไม้ เวลา หรือราคา',
  },
  {
    value: 'DECLINE',
    title: 'ไม่สะดวกรับงานนี้',
    helper: 'แจ้งเหตุผลสั้น ๆ เพื่อให้ผู้ประสานงานทราบ',
  },
];

export function SupplierResponseForm({
  token,
  product,
  preparation,
  messageCard,
}: SupplierResponseFormProps) {
  const firstImage = product.items.find((item) => item.imageUrl)?.imageUrl ?? null;
  const [photoOpen, setPhotoOpen] = useState(false);
  const [responseType, setResponseType] = useState<SupplierResponseType>('PREPARE');
  const [price, setPrice] = useState('');
  const [readyTime, setReadyTime] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  async function submitResponse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/supplier-requests/${encodeURIComponent(token)}/response`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          response_type: responseType,
          supplier_price: price,
          supplier_ready_time: readyTime,
          supplier_reason: reason,
          supplier_notes: notes,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ type: 'error', text: data.error ?? 'ส่งคำตอบไม่สำเร็จ กรุณาลองอีกครั้ง' });
        return;
      }
      setMessage({ type: 'success', text: 'ส่งคำตอบแล้ว ขอบคุณค่ะ' });
    } catch {
      setMessage({ type: 'error', text: 'ส่งคำตอบไม่สำเร็จ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองอีกครั้ง' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="supplier-task-shell">
      <main className="supplier-task-card">
        <section className="supplier-task-hero">
          {firstImage ? (
            <button
              type="button"
              className="supplier-task-photo-button"
              onClick={() => setPhotoOpen(true)}
              aria-label="เปิดรูปสินค้า"
            >
              <img src={firstImage} alt={product.items[0]?.displayTitle ?? 'รูปสินค้า'} />
            </button>
          ) : (
            <div className="supplier-task-photo-empty">ไม่มีรูปสินค้า</div>
          )}
          <div>
            <p className="supplier-task-kicker">คำขอจัดเตรียมสินค้า</p>
            <h1>รายละเอียดงาน</h1>
            <p className="supplier-task-muted">กรุณาตรวจสอบสินค้า เวลา และรายละเอียดการ์ดก่อนตอบกลับ</p>
          </div>
        </section>

        <section className="supplier-task-section">
          <h2>สินค้า</h2>
          <div className="supplier-task-items">
            {product.items.map((item, index) => (
              <article key={`${item.displayTitle}:${index}`} className="supplier-task-item">
                <div>
                  <strong>{item.displayTitle}</strong>
                  <p>
                    ขนาด: {item.sizeTh ?? item.size ?? 'ไม่ระบุ'}
                    {item.preparationTimeMinutes ? ` · เวลาเตรียม ${item.preparationTimeMinutes} นาที` : ''}
                  </p>
                </div>
              </article>
            ))}
          </div>
          {product.customOrder?.giftDescription && (
            <p className="supplier-task-note">รายละเอียดออเดอร์พิเศษ: {product.customOrder.giftDescription}</p>
          )}
          {product.customOrder?.customerComments && (
            <p className="supplier-task-note">หมายเหตุเพิ่มเติม: {product.customOrder.customerComments}</p>
          )}
        </section>

        <section className="supplier-task-section supplier-task-grid">
          <div>
            <h2>เวลาและพื้นที่</h2>
            <p>วันที่: {preparation.deliveryDate ?? 'ไม่ระบุ'}</p>
            <p>ช่วงเวลา: {preparation.deliveryWindow ?? 'ไม่ระบุ'}</p>
            <p>
              พื้นที่:{' '}
              {[preparation.deliveryDestinationLabelTh, preparation.deliveryZoneLabelTh, preparation.postalCode]
                .filter(Boolean)
                .join(' · ') || 'ไม่ระบุ'}
            </p>
          </div>
          <div>
            <h2>ข้อความและของตกแต่ง</h2>
            {messageCard.cards.some((card) => card.cardMessage || card.balloonText) ||
            messageCard.customGreetingCard ? (
              <>
                {messageCard.cards.map((card, index) => (
                  <div key={`${card.itemTitle}:${index}`} className="supplier-task-note">
                    {card.cardMessage && <p>การ์ด: {card.cardMessage}</p>}
                    {card.balloonText && <p>บอลลูน: {card.balloonText}</p>}
                    {card.wrappingOption && <p>ห่อ: {card.wrappingOption}</p>}
                  </div>
                ))}
                {messageCard.customGreetingCard && <p>การ์ดออเดอร์พิเศษ: {messageCard.customGreetingCard}</p>}
              </>
            ) : (
              <p>ไม่มีข้อความเพิ่มเติม</p>
            )}
          </div>
        </section>

        <form className="supplier-task-form" onSubmit={submitResponse}>
          <h2>ตอบกลับงานนี้</h2>
          <div className="supplier-task-options">
            {RESPONSE_OPTIONS.map((option) => (
              <label
                key={option.value}
                className={`supplier-task-option ${responseType === option.value ? 'is-selected' : ''}`}
              >
                <input
                  type="radio"
                  name="response_type"
                  value={option.value}
                  checked={responseType === option.value}
                  onChange={() => setResponseType(option.value)}
                />
                <span>
                  <strong>{option.title}</strong>
                  <small>{option.helper}</small>
                </span>
              </label>
            ))}
          </div>

          <label className="supplier-task-label">
            ราคาเสนอ
            <input
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              inputMode="decimal"
              placeholder="เช่น 1200"
            />
          </label>
          <label className="supplier-task-label">
            เวลาที่พร้อม
            <input
              value={readyTime}
              onChange={(event) => setReadyTime(event.target.value)}
              placeholder="เช่น วันนี้ 16:00"
            />
          </label>
          <label className="supplier-task-label">
            เหตุผลหรือเงื่อนไข
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={3}
              placeholder="แจ้งสิ่งที่ต้องปรับ หรือเหตุผลที่ไม่สะดวกรับงาน"
            />
          </label>
          <label className="supplier-task-label">
            โน้ตเพิ่มเติม
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
              placeholder="รายละเอียดเพิ่มเติมสำหรับผู้ประสานงาน"
            />
          </label>
          <label className="supplier-task-label supplier-task-upload-disabled">
            รูปจากร้าน
            <button type="button" disabled>
              เพิ่มรูปภาพเร็ว ๆ นี้
            </button>
          </label>

          {message && (
            <p className={message.type === 'success' ? 'supplier-task-success' : 'supplier-task-error'}>
              {message.text}
            </p>
          )}

          <div className="supplier-task-sticky">
            <button type="submit" disabled={submitting}>
              {submitting ? 'กำลังส่ง…' : 'ส่งคำตอบ'}
            </button>
          </div>
        </form>
      </main>

      {photoOpen && firstImage && (
        <div className="supplier-task-modal" role="dialog" aria-modal="true">
          <button type="button" className="supplier-task-modal-close" onClick={() => setPhotoOpen(false)}>
            ปิด
          </button>
          <img src={firstImage} alt={product.items[0]?.displayTitle ?? 'รูปสินค้า'} />
        </div>
      )}
    </div>
  );
}
