-- Align Pai customer message with other city markets (Hua Hin / Phuket pattern).
-- Fees stay in zone code and show as estimates; this copy is not unique.

UPDATE public.provinces
SET
  customer_message_en =
    'Flower delivery for Pai (subject to cutoff and coverage).',
  customer_message_th =
    'จัดส่งดอกไม้ปาย (ขึ้นกับเวลาตัดออเดอร์และความครอบคลุม)',
  updated_at = now()
WHERE province_code = 'mae-hong-son';
