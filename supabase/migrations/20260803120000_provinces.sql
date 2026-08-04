-- Provinces configuration (Feature 1 — Thailand expansion)
-- Admin-editable status/messaging layer. Does not drive Stripe, zones, or checkout.
-- Seed matches TopoJSON NAME_1 keys (76 units; Bueng Kan absent from this GADM source).

CREATE TABLE IF NOT EXISTS public.provinces (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  province_code             text UNIQUE NOT NULL,
  province_name_en          text NOT NULL,
  province_name_th          text NOT NULL,
  topojson_property_value   text,
  destination_id            text,
  status                    text NOT NULL DEFAULT 'coming_soon'
                              CHECK (status IN ('coming_soon','preorder_only','next_day','same_day','temporarily_unavailable')),
  catalog_enabled           boolean NOT NULL DEFAULT false,
  min_advance_notice_hours  integer,
  same_day_cutoff_local     text,
  customer_message_en       text,
  customer_message_th       text,
  delivery_limitations_en   text,
  delivery_limitations_th   text,
  available_categories      text[],
  seo_page_status           text NOT NULL DEFAULT 'not_planned'
                              CHECK (seo_page_status IN ('not_planned','planned','published')),
  internal_notes            text,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS provinces_status_idx ON public.provinces (status);
CREATE INDEX IF NOT EXISTS provinces_destination_id_idx ON public.provinces (destination_id);
CREATE UNIQUE INDEX IF NOT EXISTS provinces_topojson_property_value_uidx
  ON public.provinces (topojson_property_value)
  WHERE topojson_property_value IS NOT NULL;

CREATE OR REPLACE FUNCTION update_provinces_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS provinces_updated_at ON public.provinces;
CREATE TRIGGER provinces_updated_at
  BEFORE UPDATE ON public.provinces
  FOR EACH ROW EXECUTE FUNCTION update_provinces_updated_at();

ALTER TABLE public.provinces ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.provinces FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.provinces TO service_role;

INSERT INTO public.provinces (
  province_code,
  province_name_en,
  province_name_th,
  topojson_property_value,
  destination_id,
  status,
  catalog_enabled,
  customer_message_en,
  customer_message_th
)
VALUES
  ('amnat-charoen', 'Amnat Charoen', 'อำนาจเจริญ', 'Amnat Charoen', NULL, 'coming_soon', false, NULL, NULL),
  ('ang-thong', 'Ang Thong', 'อ่างทอง', 'Ang Thong', NULL, 'coming_soon', false, NULL, NULL),
  ('bangkok', 'Bangkok', 'กรุงเทพมหานคร', 'Bangkok Metropolis', NULL, 'coming_soon', false, NULL, NULL),
  ('buri-ram', 'Buri Ram', 'บุรีรัมย์', 'Buri Ram', NULL, 'coming_soon', false, NULL, NULL),
  ('chachoengsao', 'Chachoengsao', 'ฉะเชิงเทรา', 'Chachoengsao', NULL, 'coming_soon', false, NULL, NULL),
  ('chai-nat', 'Chai Nat', 'ชัยนาท', 'Chai Nat', NULL, 'coming_soon', false, NULL, NULL),
  ('chaiyaphum', 'Chaiyaphum', 'ชัยภูมิ', 'Chaiyaphum', NULL, 'coming_soon', false, NULL, NULL),
  ('chanthaburi', 'Chanthaburi', 'จันทบุรี', 'Chanthaburi', NULL, 'coming_soon', false, NULL, NULL),
  ('chiang-mai', 'Chiang Mai', 'เชียงใหม่', 'Chiang Mai', 'CHIANG_MAI', 'same_day', true, 'Same-day and next-day flower delivery across Chiang Mai (subject to cutoff and zone fees).', 'จัดส่งดอกไม้วันเดียวกันและวันถัดไปทั่วเชียงใหม่ (ขึ้นกับเวลาตัดออเดอร์และค่าโซน)'),
  ('chiang-rai', 'Chiang Rai', 'เชียงราย', 'Chiang Rai', NULL, 'coming_soon', false, NULL, NULL),
  ('chon-buri', 'Chon Buri', 'ชลบุรี', 'Chon Buri', 'PATTAYA', 'same_day', true, 'Flower delivery for Pattaya and surrounding Chon Buri areas (subject to cutoff and coverage).', 'จัดส่งดอกไม้พัทยาและพื้นที่ใกล้เคียงในชลบุรี (ขึ้นกับเวลาตัดออเดอร์และความครอบคลุม)'),
  ('chumphon', 'Chumphon', 'ชุมพร', 'Chumphon', NULL, 'coming_soon', false, NULL, NULL),
  ('kalasin', 'Kalasin', 'กาฬสินธุ์', 'Kalasin', NULL, 'coming_soon', false, NULL, NULL),
  ('kamphaeng-phet', 'Kamphaeng Phet', 'กำแพงเพชร', 'Kamphaeng Phet', NULL, 'coming_soon', false, NULL, NULL),
  ('kanchanaburi', 'Kanchanaburi', 'กาญจนบุรี', 'Kanchanaburi', NULL, 'coming_soon', false, NULL, NULL),
  ('khon-kaen', 'Khon Kaen', 'ขอนแก่น', 'Khon Kaen', NULL, 'coming_soon', false, NULL, NULL),
  ('krabi', 'Krabi', 'กระบี่', 'Krabi', 'KRABI', 'same_day', true, 'Flower delivery for Krabi / Ao Nang (subject to cutoff and coverage).', 'จัดส่งดอกไม้กระบี่ / อ่าวนาง (ขึ้นกับเวลาตัดออเดอร์และความครอบคลุม)'),
  ('lampang', 'Lampang', 'ลำปาง', 'Lampang', NULL, 'coming_soon', false, NULL, NULL),
  ('lamphun', 'Lamphun', 'ลำพูน', 'Lamphun', NULL, 'coming_soon', false, NULL, NULL),
  ('loei', 'Loei', 'เลย', 'Loei', NULL, 'coming_soon', false, NULL, NULL),
  ('lop-buri', 'Lop Buri', 'ลพบุรี', 'Lop Buri', NULL, 'coming_soon', false, NULL, NULL),
  ('mae-hong-son', 'Mae Hong Son', 'แม่ฮ่องสอน', 'Mae Hong Son', NULL, 'coming_soon', false, NULL, NULL),
  ('maha-sarakham', 'Maha Sarakham', 'มหาสารคาม', 'Maha Sarakham', NULL, 'coming_soon', false, NULL, NULL),
  ('mukdahan', 'Mukdahan', 'มุกดาหาร', 'Mukdahan', NULL, 'coming_soon', false, NULL, NULL),
  ('nakhon-nayok', 'Nakhon Nayok', 'นครนายก', 'Nakhon Nayok', NULL, 'coming_soon', false, NULL, NULL),
  ('nakhon-pathom', 'Nakhon Pathom', 'นครปฐม', 'Nakhon Pathom', NULL, 'coming_soon', false, NULL, NULL),
  ('nakhon-phanom', 'Nakhon Phanom', 'นครพนม', 'Nakhon Phanom', NULL, 'coming_soon', false, NULL, NULL),
  ('nakhon-ratchasima', 'Nakhon Ratchasima', 'นครราชสีมา', 'Nakhon Ratchasima', NULL, 'coming_soon', false, NULL, NULL),
  ('nakhon-sawan', 'Nakhon Sawan', 'นครสวรรค์', 'Nakhon Sawan', NULL, 'coming_soon', false, NULL, NULL),
  ('nakhon-si-thammarat', 'Nakhon Si Thammarat', 'นครศรีธรรมราช', 'Nakhon Si Thammarat', NULL, 'coming_soon', false, NULL, NULL),
  ('nan', 'Nan', 'น่าน', 'Nan', NULL, 'coming_soon', false, NULL, NULL),
  ('narathiwat', 'Narathiwat', 'นราธิวาส', 'Narathiwat', NULL, 'coming_soon', false, NULL, NULL),
  ('nong-bua-lam-phu', 'Nong Bua Lam Phu', 'หนองบัวลำภู', 'Nong Bua Lam Phu', NULL, 'coming_soon', false, NULL, NULL),
  ('nong-khai', 'Nong Khai', 'หนองคาย', 'Nong Khai', NULL, 'coming_soon', false, NULL, NULL),
  ('nonthaburi', 'Nonthaburi', 'นนทบุรี', 'Nonthaburi', NULL, 'coming_soon', false, NULL, NULL),
  ('pathum-thani', 'Pathum Thani', 'ปทุมธานี', 'Pathum Thani', NULL, 'coming_soon', false, NULL, NULL),
  ('pattani', 'Pattani', 'ปัตตานี', 'Pattani', NULL, 'coming_soon', false, NULL, NULL),
  ('phangnga', 'Phangnga', 'พังงา', 'Phangnga', NULL, 'coming_soon', false, NULL, NULL),
  ('phatthalung', 'Phatthalung', 'พัทลุง', 'Phatthalung', NULL, 'coming_soon', false, NULL, NULL),
  ('phayao', 'Phayao', 'พะเยา', 'Phayao', NULL, 'coming_soon', false, NULL, NULL),
  ('phetchabun', 'Phetchabun', 'เพชรบูรณ์', 'Phetchabun', NULL, 'coming_soon', false, NULL, NULL),
  ('phetchaburi', 'Phetchaburi', 'เพชรบุรี', 'Phetchaburi', NULL, 'coming_soon', false, NULL, NULL),
  ('phichit', 'Phichit', 'พิจิตร', 'Phichit', NULL, 'coming_soon', false, NULL, NULL),
  ('phitsanulok', 'Phitsanulok', 'พิษณุโลก', 'Phitsanulok', NULL, 'coming_soon', false, NULL, NULL),
  ('phra-nakhon-si-ayutthaya', 'Phra Nakhon Si Ayutthaya', 'พระนครศรีอยุธยา', 'Phra Nakhon Si Ayutthaya', NULL, 'coming_soon', false, NULL, NULL),
  ('phrae', 'Phrae', 'แพร่', 'Phrae', NULL, 'coming_soon', false, NULL, NULL),
  ('phuket', 'Phuket', 'ภูเก็ต', 'Phuket', 'PHUKET', 'same_day', true, 'Flower delivery across Phuket (subject to cutoff and coverage).', 'จัดส่งดอกไม้ทั่วภูเก็ต (ขึ้นกับเวลาตัดออเดอร์และความครอบคลุม)'),
  ('prachin-buri', 'Prachin Buri', 'ปราจีนบุรี', 'Prachin Buri', NULL, 'coming_soon', false, NULL, NULL),
  ('prachuap-khiri-khan', 'Prachuap Khiri Khan', 'ประจวบคีรีขันธ์', 'Prachuap Khiri Khan', 'HUA_HIN', 'same_day', true, 'Flower delivery for Hua Hin (subject to cutoff and coverage).', 'จัดส่งดอกไม้หัวหิน (ขึ้นกับเวลาตัดออเดอร์และความครอบคลุม)'),
  ('ranong', 'Ranong', 'ระนอง', 'Ranong', NULL, 'coming_soon', false, NULL, NULL),
  ('ratchaburi', 'Ratchaburi', 'ราชบุรี', 'Ratchaburi', NULL, 'coming_soon', false, NULL, NULL),
  ('rayong', 'Rayong', 'ระยอง', 'Rayong', NULL, 'coming_soon', false, NULL, NULL),
  ('roi-et', 'Roi Et', 'ร้อยเอ็ด', 'Roi Et', NULL, 'coming_soon', false, NULL, NULL),
  ('sa-kaeo', 'Sa Kaeo', 'สระแก้ว', 'Sa Kaeo', NULL, 'coming_soon', false, NULL, NULL),
  ('sakon-nakhon', 'Sakon Nakhon', 'สกลนคร', 'Sakon Nakhon', NULL, 'coming_soon', false, NULL, NULL),
  ('samut-prakan', 'Samut Prakan', 'สมุทรปราการ', 'Samut Prakan', NULL, 'coming_soon', false, NULL, NULL),
  ('samut-sakhon', 'Samut Sakhon', 'สมุทรสาคร', 'Samut Sakhon', NULL, 'coming_soon', false, NULL, NULL),
  ('samut-songkhram', 'Samut Songkhram', 'สมุทรสงคราม', 'Samut Songkhram', NULL, 'coming_soon', false, NULL, NULL),
  ('saraburi', 'Saraburi', 'สระบุรี', 'Saraburi', NULL, 'coming_soon', false, NULL, NULL),
  ('satun', 'Satun', 'สตูล', 'Satun', NULL, 'coming_soon', false, NULL, NULL),
  ('si-sa-ket', 'Si Sa Ket', 'ศรีสะเกษ', 'Si Sa Ket', NULL, 'coming_soon', false, NULL, NULL),
  ('sing-buri', 'Sing Buri', 'สิงห์บุรี', 'Sing Buri', NULL, 'coming_soon', false, NULL, NULL),
  ('songkhla', 'Songkhla', 'สงขลา', 'Songkhla', NULL, 'coming_soon', false, NULL, NULL),
  ('sukhothai', 'Sukhothai', 'สุโขทัย', 'Sukhothai', NULL, 'coming_soon', false, NULL, NULL),
  ('suphan-buri', 'Suphan Buri', 'สุพรรณบุรี', 'Suphan Buri', NULL, 'coming_soon', false, NULL, NULL),
  ('surat-thani', 'Surat Thani', 'สุราษฎร์ธานี', 'Surat Thani', 'SAMUI', 'same_day', true, 'Flower delivery for Koh Samui (Surat Thani). Mainland coverage may be limited.', 'จัดส่งดอกไม้เกาะสมุย (สุราษฎร์ธานี) พื้นที่ฝั่งแผ่นดินอาจจำกัด'),
  ('surin', 'Surin', 'สุรินทร์', 'Surin', NULL, 'coming_soon', false, NULL, NULL),
  ('tak', 'Tak', 'ตาก', 'Tak', NULL, 'coming_soon', false, NULL, NULL),
  ('trang', 'Trang', 'ตรัง', 'Trang', NULL, 'coming_soon', false, NULL, NULL),
  ('trat', 'Trat', 'ตราด', 'Trat', NULL, 'coming_soon', false, NULL, NULL),
  ('ubon-ratchathani', 'Ubon Ratchathani', 'อุบลราชธานี', 'Ubon Ratchathani', NULL, 'coming_soon', false, NULL, NULL),
  ('udon-thani', 'Udon Thani', 'อุดรธานี', 'Udon Thani', NULL, 'coming_soon', false, NULL, NULL),
  ('uthai-thani', 'Uthai Thani', 'อุทัยธานี', 'Uthai Thani', NULL, 'coming_soon', false, NULL, NULL),
  ('uttaradit', 'Uttaradit', 'อุตรดิตถ์', 'Uttaradit', NULL, 'coming_soon', false, NULL, NULL),
  ('yala', 'Yala', 'ยะลา', 'Yala', NULL, 'coming_soon', false, NULL, NULL),
  ('yasothon', 'Yasothon', 'ยโสธร', 'Yasothon', NULL, 'coming_soon', false, NULL, NULL)
ON CONFLICT (province_code) DO NOTHING;
