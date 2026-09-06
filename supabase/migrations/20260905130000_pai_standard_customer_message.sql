-- Align Pai customer message with other city markets (Hua Hin / Phuket pattern).
-- Fees stay in zone code and show as estimates; this copy is not unique.

UPDATE public.provinces
SET
  customer_message_en =
    'All arrangements are subject to flower availability. Please contact before place order.',
  customer_message_th =
    'การจัดดอกไม้ทุกแบบขึ้นอยู่กับความพร้อมของดอกไม้ กรุณาติดต่อก่อนสั่งซื้อ',
  updated_at = now()
WHERE province_code = 'mae-hong-son';
