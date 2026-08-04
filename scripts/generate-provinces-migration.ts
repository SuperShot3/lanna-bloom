import { writeFileSync } from 'fs';
import { PROVINCE_SEED_ROSTER } from '../lib/provinces/seedRoster';

function esc(s: string | null | undefined): string {
  if (s == null) return 'NULL';
  return "'" + String(s).replace(/'/g, "''") + "'";
}

const values = PROVINCE_SEED_ROSTER.map((r) => {
  return `  (${esc(r.province_code)}, ${esc(r.province_name_en)}, ${esc(r.province_name_th)}, ${esc(r.topojson_property_value)}, ${esc(r.destination_id)}, ${esc(r.status)}, ${r.catalog_enabled}, ${esc(r.customer_message_en ?? null)}, ${esc(r.customer_message_th ?? null)})`;
}).join(',\n');

const sql = `-- Provinces configuration (Feature 1 — Thailand expansion)
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
${values}
ON CONFLICT (province_code) DO NOTHING;
`;

writeFileSync('supabase/migrations/20260803120000_provinces.sql', sql);
console.log('wrote migration, rows:', PROVINCE_SEED_ROSTER.length);
