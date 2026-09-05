-- Pai: standard Chiang Mai–to–Pai delivery fee is ฿550 (zones live in app code).
-- Refresh the Mae Hong Son customer message so admin/public copy matches.
-- Coverage remains Pai district only — not Mae Hong Son town or other amphoes.

UPDATE public.provinces
SET
  customer_message_en =
    'Flower delivery for Pai, Mae Hong Son — prepared in Chiang Mai, standard delivery ฿550 (subject to cutoff and coverage). Not Mae Hong Son town or other districts.',
  customer_message_th =
    'จัดส่งดอกไม้ปาย จังหวัดแม่ฮ่องสอน — จัดช่อจากเชียงใหม่ ค่าส่งมาตรฐาน ฿550 (ขึ้นกับเวลาตัดออเดอร์และความครอบคลุม) ไม่ครอบคลุมตัวเมืองแม่ฮ่องสอนหรืออำเภออื่น',
  updated_at = now()
WHERE province_code = 'mae-hong-son';
