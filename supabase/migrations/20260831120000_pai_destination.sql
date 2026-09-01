-- Wire Mae Hong Son as a Pai city market (destination PAI).
-- Destination/zones live in app code; this updates the admin provinces row.
-- Coverage is Pai district only — not Mae Hong Son town or other amphoes.

UPDATE public.provinces
SET
  destination_id = 'PAI',
  status = 'same_day',
  catalog_enabled = true,
  customer_message_en =
    'Flower delivery for Pai, Mae Hong Son (subject to cutoff and coverage). Not Mae Hong Son town or other districts.',
  customer_message_th =
    'จัดส่งดอกไม้ปาย จังหวัดแม่ฮ่องสอน (ขึ้นกับเวลาตัดออเดอร์และความครอบคลุม) ไม่ครอบคลุมตัวเมืองแม่ฮ่องสอนหรืออำเภออื่น',
  updated_at = now()
WHERE province_code = 'mae-hong-son';
