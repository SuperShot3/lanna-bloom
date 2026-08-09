-- Wire Lamphun as next-day orderable market (destination LAMPHUN).
-- Destination/zones live in app code; this updates the admin provinces row.

UPDATE public.provinces
SET
  destination_id = 'LAMPHUN',
  status = 'next_day',
  catalog_enabled = true,
  same_day_cutoff_local = NULL,
  customer_message_en =
    'Next-day flower delivery across Lamphun province (delivery from ฿250; same-day not available).',
  customer_message_th =
    'จัดส่งดอกไม้วันถัดไปทั่วจังหวัดลำพูน (ค่าส่งเริ่มต้น ฿250 ไม่มีบริการวันเดียวกัน)',
  updated_at = now()
WHERE province_code = 'lamphun';
