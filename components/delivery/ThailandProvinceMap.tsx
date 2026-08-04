'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FeatureCollection, Geometry } from 'geojson';
import type { Locale } from '@/lib/i18n';
import type { ProvinceStatus, PublicProvince } from '@/lib/provinces/types';
import {
  getProvinceStatusFillColor,
  getProvinceStatusLabel,
  PROVINCE_STATUS_LEGEND,
} from '@/lib/provinces/statusColors';
import { TOPOJSON_LAKE_ALIASES } from '@/lib/provinces/seedRoster';
import { buildCoveragePanelDisplay } from '@/lib/delivery/coverageDisplay';
import { getChiangMaiAmphoeDrillItems } from '@/lib/delivery/chiangMaiMapDrilldown';
import styles from './thailand-province-map.module.css';

export type ThailandProvinceMapMode = 'admin' | 'public';

export type ThailandProvinceMapProvince = Pick<
  PublicProvince,
  | 'province_code'
  | 'province_name_en'
  | 'province_name_th'
  | 'topojson_property_value'
  | 'status'
  | 'catalog_enabled'
  | 'min_advance_notice_hours'
  | 'same_day_cutoff_local'
  | 'customer_message_en'
  | 'customer_message_th'
  | 'delivery_limitations_en'
  | 'delivery_limitations_th'
  | 'available_categories'
>;

type Props = {
  mode: ThailandProvinceMapMode;
  provinces: ThailandProvinceMapProvince[];
  lang?: Locale;
  selectedCode?: string | null;
  onSelectProvince?: (code: string) => void;
  className?: string;
};

const THAILAND_CENTER: [number, number] = [13.5, 101.0];
const DEFAULT_ZOOM = 5.6;
const MIN_ZOOM = 5;
const MAX_ZOOM = 10;
const CHIANG_MAI_CODE = 'chiang-mai';

type TopologyLike = {
  type: string;
  objects: { province: unknown };
  arcs: unknown;
};

type LeafletBounds = {
  isValid: () => boolean;
  pad: (bufferRatio: number) => LeafletBounds;
};

function resolveTopoName(name: string): string {
  return TOPOJSON_LAKE_ALIASES[name] ?? name;
}

function MapInner({
  geojson,
  byTopoName,
  selectedCode,
  onSelect,
}: {
  geojson: FeatureCollection<Geometry, { NAME_1?: string }>;
  byTopoName: Map<string, ThailandProvinceMapProvince>;
  selectedCode: string | null;
  onSelect: (code: string) => void;
}) {
  const { MapContainer, GeoJSON, useMap } = require('react-leaflet');
  const L = require('leaflet');
  const geoJsonRef = useRef<{ resetStyle: (layer?: unknown) => void } | null>(null);
  const layerByCode = useRef(new Map<string, { getBounds?: () => LeafletBounds }>());

  function ZoomButtons() {
    const map = useMap();
    return (
      <div className={styles.zoomControls} role="group" aria-label="Map zoom">
        <button
          type="button"
          className={styles.zoomBtn}
          aria-label="Zoom in"
          onClick={() => map.zoomIn()}
        >
          <span aria-hidden>+</span>
        </button>
        <button
          type="button"
          className={styles.zoomBtn}
          aria-label="Zoom out"
          onClick={() => map.zoomOut()}
        >
          <span aria-hidden>−</span>
        </button>
      </div>
    );
  }

  /** Fit Thailand once and lock panning to the country (no world view). */
  function FitThailand() {
    const map = useMap();
    useEffect(() => {
      const layer = L.geoJSON(geojson);
      const bounds = layer.getBounds() as LeafletBounds;
      if (!bounds.isValid()) return;
      map.setMaxBounds(bounds.pad(0.12));
      map.options.maxBoundsViscosity = 1.0;
      map.fitBounds(bounds as never, { padding: [8, 8], animate: false });
      const fittedZoom = map.getBoundsZoom(bounds as never, false);
      if (typeof fittedZoom === 'number' && Number.isFinite(fittedZoom)) {
        map.setMinZoom(Math.max(MIN_ZOOM, fittedZoom - 0.15));
      }
    }, [map]);
    return null;
  }

  function FitSelected() {
    const map = useMap();
    useEffect(() => {
      if (!selectedCode) {
        const layer = L.geoJSON(geojson);
        const bounds = layer.getBounds() as LeafletBounds;
        if (bounds.isValid()) {
          map.fitBounds(bounds as never, { padding: [8, 8], animate: true });
        }
        return;
      }
      const layer = layerByCode.current.get(selectedCode);
      if (layer?.getBounds) {
        const bounds = layer.getBounds();
        if (bounds?.isValid?.()) {
          map.fitBounds(bounds as never, {
            padding: [36, 36],
            maxZoom: selectedCode === CHIANG_MAI_CODE ? 9 : 8,
            animate: true,
          });
        }
      }
    }, [map, selectedCode]);
    return null;
  }

  const styleFor = useCallback(
    (feature?: { properties?: { NAME_1?: string } }) => {
      const rawName = feature?.properties?.NAME_1 ?? '';
      const name = resolveTopoName(rawName);
      const province = byTopoName.get(name);
      const selected = province?.province_code === selectedCode;
      const isLake = Boolean(TOPOJSON_LAKE_ALIASES[rawName]);
      const dimOthers = Boolean(selectedCode) && !selected;
      return {
        fillColor: province
          ? getProvinceStatusFillColor(province.status)
          : isLake
            ? '#A8C8D8'
            : '#E8E4DC',
        fillOpacity: isLake ? 0.35 : selected ? 0.95 : dimOthers ? 0.28 : 0.78,
        color: selected ? '#1A3C34' : '#FDFCF8',
        weight: selected ? 2 : 0.9,
        opacity: 1,
      };
    },
    [byTopoName, selectedCode]
  );

  const onEachFeature = useCallback(
    (
      feature: { properties?: { NAME_1?: string } },
      layer: {
        on: (events: Record<string, () => void>) => void;
        setStyle: (s: object) => void;
        getBounds?: () => LeafletBounds;
      }
    ) => {
      const rawName = feature.properties?.NAME_1 ?? '';
      const name = resolveTopoName(rawName);
      const province = byTopoName.get(name);
      if (province) {
        layerByCode.current.set(province.province_code, layer);
      }
      layer.on({
        click: () => {
          if (province) onSelect(province.province_code);
        },
        mouseover: () => {
          if (province?.province_code !== selectedCode) {
            layer.setStyle({ weight: 1.5, color: '#1A3C34' });
          }
        },
        mouseout: () => {
          if (geoJsonRef.current) {
            geoJsonRef.current.resetStyle(layer);
          }
        },
      });
    },
    [byTopoName, onSelect, selectedCode]
  );

  return (
    <MapContainer
      center={THAILAND_CENTER}
      zoom={DEFAULT_ZOOM}
      minZoom={MIN_ZOOM}
      maxZoom={MAX_ZOOM}
      zoomControl={false}
      attributionControl={false}
      dragging
      doubleClickZoom
      scrollWheelZoom={false}
      className={styles.mapInner}
      style={{ height: '100%', width: '100%', background: 'transparent' }}
    >
      {/* No world tile layer — Thailand choropleth only */}
      <GeoJSON
        key={selectedCode ?? 'none'}
        data={geojson}
        style={styleFor}
        onEachFeature={onEachFeature}
        ref={(ref: typeof geoJsonRef.current) => {
          geoJsonRef.current = ref;
        }}
      />
      <FitThailand />
      <FitSelected />
      <ZoomButtons />
    </MapContainer>
  );
}

function ChiangMaiDrilldown({
  lang,
  mode,
}: {
  lang: Locale;
  mode: ThailandProvinceMapMode;
}) {
  const isTh = lang === 'th';
  const items = useMemo(() => getChiangMaiAmphoeDrillItems(lang), [lang]);
  const [amphoeId, setAmphoeId] = useState<string | null>(null);
  const selected = items.find((i) => i.amphoe.id === amphoeId) ?? null;

  return (
    <div className={styles.cmDrill}>
      <p className={styles.cmDrillTitle}>
        {isTh ? 'อำเภอในเชียงใหม่' : 'Districts in Chiang Mai'}
      </p>
      <div className={styles.cmChipRow} role="list">
        {items.map(({ amphoe }) => {
          const active = amphoe.id === amphoeId;
          return (
            <button
              key={amphoe.id}
              type="button"
              role="listitem"
              className={`${styles.cmChip} ${active ? styles.cmChipActive : ''}`}
              onClick={() => setAmphoeId(active ? null : amphoe.id)}
            >
              {isTh ? amphoe.labelTh : amphoe.labelEn}
            </button>
          );
        })}
      </div>

      {selected ? (
        <div className={styles.cmAmphoeDetail}>
          <p className={styles.cmAmphoeMeta}>
            <strong>{isTh ? selected.amphoe.labelTh : selected.amphoe.labelEn}</strong>
            <span> · {selected.feeLabel}</span>
          </p>
          <p className={styles.infoLimits}>
            {isTh ? selected.amphoe.typicalAreasTh : selected.amphoe.typicalAreasEn}
          </p>

          {selected.subAreas.length > 0 ? (
            <>
              <p className={styles.cmSubTitle}>
                {isTh ? 'ตำบล / พื้นที่ย่อยในอำเภอนี้' : 'Sub-districts / areas in this district'}
              </p>
              <ul className={styles.cmSubList}>
                {selected.subAreas.map((sub) => (
                  <li key={sub.zoneId}>
                    <span>{isTh ? sub.labelTh : sub.labelEn}</span>
                    {sub.feeThb != null ? (
                      <span className={styles.cmSubFee}>
                        {sub.manualQuote
                          ? isTh
                            ? 'ยืนยันกับคนขับ'
                            : 'Confirm with driver'
                          : `฿${sub.feeThb}`}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className={styles.cmSubHint}>
              {isTh
                ? 'อำเภอนี้ใช้โซนจัดส่งเดียว — ยืนยันที่อยู่ตอนเช็กเอาต์'
                : 'This district uses one delivery zone — confirm the address at checkout'}
            </p>
          )}

          {mode === 'public' ? (
            <a className={styles.infoCta} href={`/${lang}/delivery-areas-chiang-mai#chiang-mai-delivery-title`}>
              {isTh ? 'ดูแผนที่อำเภอแบบละเอียด' : 'Open detailed district map'}
            </a>
          ) : null}
        </div>
      ) : (
        <p className={styles.cmSubHint}>
          {isTh
            ? 'แตะอำเภอเพื่อดูตำบล/พื้นที่จัดส่งย่อย (เฉพาะเชียงใหม่)'
            : 'Tap a district to see sub-district delivery areas (Chiang Mai only)'}
        </p>
      )}
    </div>
  );
}

export function ThailandProvinceMap({
  mode,
  provinces,
  lang = 'en',
  selectedCode: controlledSelected,
  onSelectProvince,
  className,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [geojson, setGeojson] = useState<FeatureCollection<Geometry, { NAME_1?: string }> | null>(
    null
  );
  const [loadError, setLoadError] = useState<string | null>(null);
  const [internalSelected, setInternalSelected] = useState<string | null>(null);

  const selectedCode = controlledSelected !== undefined ? controlledSelected : internalSelected;
  const isTh = lang === 'th';

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch('/api/maps/thailand-provinces');
        if (!res.ok) throw new Error('Failed to load map');
        const topology = (await res.json()) as TopologyLike;
        const { feature } = await import('topojson-client');
        const fc = feature(
          topology as never,
          topology.objects.province as never
        ) as unknown as FeatureCollection<Geometry, { NAME_1?: string }>;
        if (!cancelled) setGeojson(fc);
      } catch (err) {
        console.error('[ThailandProvinceMap] load failed:', err);
        if (!cancelled) setLoadError(isTh ? 'โหลดแผนที่ไม่สำเร็จ' : 'Could not load map');
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [isTh]);

  const byTopoName = useMemo(() => {
    const map = new Map<string, ThailandProvinceMapProvince>();
    for (const p of provinces) {
      if (p.topojson_property_value) {
        map.set(p.topojson_property_value, p);
      }
    }
    return map;
  }, [provinces]);

  const selected = useMemo(
    () => provinces.find((p) => p.province_code === selectedCode) ?? null,
    [provinces, selectedCode]
  );

  const handleSelect = useCallback(
    (code: string) => {
      const next = code || null;
      if (controlledSelected === undefined) setInternalSelected(next);
      if (code) onSelectProvince?.(code);
      else onSelectProvince?.('');
    },
    [controlledSelected, onSelectProvince]
  );

  const message =
    selected &&
    (isTh
      ? selected.customer_message_th || selected.customer_message_en
      : selected.customer_message_en || selected.customer_message_th);

  const limitations =
    selected &&
    (isTh
      ? selected.delivery_limitations_th || selected.delivery_limitations_en
      : selected.delivery_limitations_en || selected.delivery_limitations_th);

  const coverage =
    selected && mode === 'public'
      ? buildCoveragePanelDisplay(selected, lang)
      : null;

  return (
    <div className={`${styles.wrap} ${className ?? ''}`}>
      <div className={styles.mapViewport} aria-label={isTh ? 'แผนที่จังหวัด' : 'Thailand province map'}>
        {!mounted || !geojson ? (
          <div className={styles.mapPlaceholder}>
            {loadError ?? (isTh ? 'กำลังโหลดแผนที่…' : 'Loading map…')}
          </div>
        ) : (
          <MapInner
            geojson={geojson}
            byTopoName={byTopoName}
            selectedCode={selectedCode}
            onSelect={handleSelect}
          />
        )}

        {selected ? (
          <div className={styles.infoOverlay} role="status" aria-live="polite">
            <div className={styles.infoHeader}>
              <span
                className={styles.statusDot}
                style={{ background: getProvinceStatusFillColor(selected.status) }}
                aria-hidden
              />
              <div className={styles.infoTitles}>
                <strong className={styles.infoName}>
                  {isTh ? selected.province_name_th : selected.province_name_en}
                </strong>
                <span className={styles.infoStatus}>
                  {getProvinceStatusLabel(selected.status as ProvinceStatus)}
                  {selected.catalog_enabled
                    ? isTh
                      ? ' · เปิดดูแคตตาล็อก'
                      : ' · Catalog open'
                    : ''}
                </span>
              </div>
              <button
                type="button"
                className={styles.infoClose}
                aria-label={isTh ? 'ปิด' : 'Close'}
                onClick={() => handleSelect('')}
              >
                ×
              </button>
            </div>
            {message ? <p className={styles.infoMessage}>{message}</p> : null}
            {limitations ? <p className={styles.infoLimits}>{limitations}</p> : null}

            {coverage ? (
              <div className={styles.infoMeta}>
                {coverage.timingLine ? (
                  <p className={styles.infoTiming}>{coverage.timingLine}</p>
                ) : null}
                {coverage.cutoffLine ? (
                  <p className={styles.infoTiming}>{coverage.cutoffLine}</p>
                ) : null}
                {!coverage.orderingAllowed &&
                coverage.blockedNotice &&
                !message ? (
                  <p className={styles.infoTiming}>{coverage.blockedNotice}</p>
                ) : null}
                <p className={styles.infoCategories}>
                  {isTh ? 'สินค้าที่จัดส่งได้: ' : 'Available: '}
                  {coverage.categoriesLine}
                </p>
              </div>
            ) : null}

            {selected.province_code === CHIANG_MAI_CODE ? (
              <ChiangMaiDrilldown lang={lang} mode={mode} />
            ) : null}

            {mode === 'public' && coverage?.shoppable ? (
              <a className={styles.infoCta} href={coverage.catalogHref}>
                {isTh ? 'ดูแคตตาล็อก' : 'Browse catalog'}
              </a>
            ) : null}
            {mode === 'public' && coverage?.showPartnerCta ? (
              <>
                {!message ? (
                  <p className={styles.infoRecruit}>{coverage.partnerFallbackMessage}</p>
                ) : null}
                <a className={styles.infoCta} href={coverage.partnerApplyHref}>
                  {isTh ? 'สมัครเป็นพาร์ทเนอร์' : 'Partner with us'}
                </a>
              </>
            ) : null}
            {mode === 'admin' ? (
              <p className={styles.infoAdminHint}>
                Editing panel follows selection · {selected.province_code}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      <ul className={styles.legend} aria-label={isTh ? 'คำอธิบายสี' : 'Status legend'}>
        {PROVINCE_STATUS_LEGEND.map((item) => (
          <li key={item.status}>
            <span className={styles.legendSwatch} style={{ background: item.color }} aria-hidden />
            <span>{item.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
