-- Wire Bangkok as same-day orderable market (destination BANGKOK).
-- Destination/zones live in app code; this updates the admin provinces row.

UPDATE public.provinces
SET
  destination_id = 'BANGKOK',
  status = 'same_day',
  catalog_enabled = true,
  customer_message_en =
    'Same-day flower delivery across Bangkok (subject to cutoff and zone fees; delivery from ฿250).',
  customer_message_th =
    'จัดส่งดอกไม้วันเดียวกันทั่วกรุงเทพฯ (ขึ้นกับเวลาตัดออเดอร์และค่าโซน ค่าส่งเริ่มต้น ฿250)',
  updated_at = now()
WHERE province_code = 'bangkok';
