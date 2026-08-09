'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import type { FeatureCollection, Geometry } from 'geojson';
import 'leaflet/dist/leaflet.css';
import type { Locale } from '@/lib/i18n';
import {
  amphoeMapFill,
  formatAmphoeFeeDisplay,
  resolveAmphoeFeeDisplay,
  resolveOtherAmphoeFeeDisplay,
  type AmphoeFeeDisplay,
} from '@/lib/delivery/amphoeDisplayFees';
import {
  AMPHOE_MAP_DISTRICTS,
  AMPHOE_MAP_OTHER,
  type AmphoeMapDistrict,
  type AmphoeMapId,
} from '@/lib/delivery/amphoeMapData';
import { getDeliveryDistanceTiers } from '@/lib/delivery/distanceTiers';
import styles from './delivery-district-map.module.css';

type SelectionId = AmphoeMapId | 'other' | '';

interface DeliveryDistrictMapProps {
  lang: Locale;
}

type AmphoeFeatureProps = {
  amp_code?: string;
  amp_en?: string;
  amp_th?: string;
};

type TopologyLike = {
  type: string;
  objects: { districts: unknown };
  arcs: unknown;
};

type LeafletBounds = {
  isValid: () => boolean;
  pad: (bufferRatio: number) => LeafletBounds;
};

const CM_CENTER: [number, number] = [18.8, 98.9];
const DEFAULT_ZOOM = 9;
const MIN_ZOOM = 8;
const MAX_ZOOM = 12;
const COPY = {
  en: {
    title: 'Check your delivery area',
    subtitle: 'Select a district from the list or tap it on the map to see delivery fees.',
    districtLabel: 'District',
    selectPlaceholder: 'Select district',
    noSelectionTitle: 'No district selected',
    noSelectionText: 'Choose a district to see the delivery fee for your area.',
    manualText:
      'This area needs route confirmation. Please message us before ordering — we will confirm availability and the exact delivery fee with the driver.',
    feeLabel: 'Delivery fee',
    feeLabelEstimate: 'Estimated fee',
    feeNote: 'Final fee is confirmed at checkout based on your exact address or map pin.',
    feeNoteDriver:
      'This is an estimate only — confirm with the driver before ordering. Not a guaranteed checkout price.',
    driverBadge: 'Confirm with driver',
    orderCta: 'Order for today',
    contactCta: 'Message us about your area',
    otherLabel: AMPHOE_MAP_OTHER.labelEn,
    tableSummary: 'Full distance-based fee reference',
    tableDistance: 'Distance from Warorot',
    tableFee: 'Fee',
    tableAreas: 'Typical areas',
    tableFootnote:
      'Checkout charges the zone fee for your exact address. Kilometre bands are a distance guide only; fees match our Chiang Mai zone ladder.',
    manualFee: 'Contact us',
    legendNear: 'Closer / lower fee',
    legendFar: 'Farther / higher fee',
    mapHint: 'Tap a district',
    mapLoadError: 'Could not load district map',
    mapLoading: 'Loading map…',
  },
  th: {
    title: 'ตรวจสอบพื้นที่จัดส่ง',
    subtitle: 'เลือกอำเภอจากรายการหรือแตะบนแผนที่เพื่อดูค่าจัดส่ง',
    districtLabel: 'อำเภอ',
    selectPlaceholder: 'เลือกอำเภอ',
    noSelectionTitle: 'ยังไม่ได้เลือกอำเภอ',
    noSelectionText: 'เลือกอำเภอเพื่อดูค่าจัดส่งสำหรับพื้นที่ของคุณ',
    manualText:
      'พื้นที่นี้ต้องยืนยันเส้นทาง กรุณาทักเราก่อนสั่งซื้อ — เราจะยืนยันความพร้อมและค่าจัดส่งกับพนักงานขับรถ',
    feeLabel: 'ค่าจัดส่ง',
    feeLabelEstimate: 'ค่าจัดส่งโดยประมาณ',
    feeNote: 'ค่าจัดส่งสุดท้ายยืนยันตอนเช็กเอาต์ตามที่อยู่หรือหมุดแผนที่ของคุณ',
    feeNoteDriver:
      'นี่เป็นเพียงประมาณการ — ยืนยันกับพนักงานขับรถก่อนสั่งซื้อ ไม่ใช่ราคารับประกันตอนเช็กเอาต์',
    driverBadge: 'ยืนยันกับพนักงานขับรถ',
    orderCta: 'สั่งส่งวันนี้',
    contactCta: 'ทักถามพื้นที่ของคุณ',
    otherLabel: AMPHOE_MAP_OTHER.labelTh,
    tableSummary: 'ตารางอ้างอิงค่าจัดส่งตามระยะทาง',
    tableDistance: 'ระยะจากตลาดวโรรส',
    tableFee: 'ค่าจัดส่ง',
    tableAreas: 'พื้นที่โดยทั่วไป',
    tableFootnote:
      'ตอนเช็กเอาต์คิดตามค่าโซนตามที่อยู่จริง แถบระยะทางเป็นแนวทางเท่านั้น ค่าจัดส่งตรงกับบันไดโซนเชียงใหม่ของเรา',
    manualFee: 'ติดต่อเรา',
    legendNear: 'ใกล้กว่า / ค่าส่งต่ำกว่า',
    legendFar: 'ไกลกว่า / ค่าส่งสูงกว่า',
    mapHint: 'แตะอำเภอบนแผนที่',
    mapLoadError: 'โหลดแผนที่อำเภอไม่สำเร็จ',
    mapLoading: 'กำลังโหลดแผนที่…',
  },
} as const;

type MapLang = keyof typeof COPY;

function mapLang(lang: Locale): MapLang {
  return lang === 'th' ? 'th' : 'en';
}

const LEGEND_SWATCHES = [
  '#9fcbb4',
  '#c4dba0',
  '#e4d094',
  '#e8c08a',
  '#d49896',
  '#a890b0',
] as const;

function AmphoeLeafletMap({
  geojson,
  byAmpCode,
  selectedId,
  onSelect,
  lang,
}: {
  geojson: FeatureCollection<Geometry, AmphoeFeatureProps>;
  byAmpCode: Map<string, AmphoeMapDistrict>;
  selectedId: SelectionId;
  onSelect: (id: AmphoeMapId) => void;
  lang: Locale;
}) {
  const { MapContainer, GeoJSON, useMap } = require('react-leaflet');
  const L = require('leaflet');
  const geoJsonRef = useRef<{ resetStyle: (layer?: unknown) => void } | null>(null);
  const layerById = useRef(new Map<string, { getBounds?: () => LeafletBounds }>());

  function ZoomButtons() {
    const map = useMap();
    return (
      <div className={styles.zoomControls} role="group" aria-label="Map zoom">
        <button type="button" className={styles.zoomBtn} aria-label="Zoom in" onClick={() => map.zoomIn()}>
          <span aria-hidden>+</span>
        </button>
        <button type="button" className={styles.zoomBtn} aria-label="Zoom out" onClick={() => map.zoomOut()}>
          <span aria-hidden>−</span>
        </button>
      </div>
    );
  }

  function FitProvince() {
    const map = useMap();
    useEffect(() => {
      const layer = L.geoJSON(geojson);
      const bounds = layer.getBounds() as LeafletBounds;
      if (!bounds.isValid()) return;
      map.setMaxBounds(bounds.pad(0.18));
      map.options.maxBoundsViscosity = 0.85;
      map.fitBounds(bounds as never, { padding: [12, 12], animate: false });
      const fittedZoom = map.getBoundsZoom(bounds as never, false);
      if (typeof fittedZoom === 'number' && Number.isFinite(fittedZoom)) {
        map.setMinZoom(Math.max(MIN_ZOOM, fittedZoom - 0.2));
      }
    }, [map]);
    return null;
  }

  function FitSelected() {
    const map = useMap();
    useEffect(() => {
      if (!selectedId || selectedId === 'other') {
        const layer = L.geoJSON(geojson);
        const bounds = layer.getBounds() as LeafletBounds;
        if (bounds.isValid()) {
          map.fitBounds(bounds as never, { padding: [12, 12], animate: true });
        }
        return;
      }
      const layer = layerById.current.get(selectedId);
      if (layer?.getBounds) {
        const bounds = layer.getBounds();
        if (bounds?.isValid?.()) {
          map.fitBounds(bounds as never, { padding: [40, 40], maxZoom: 11, animate: true });
        }
      }
    }, [map, selectedId]);
    return null;
  }

  const styleFor = useCallback(
    (feature?: { properties?: AmphoeFeatureProps }) => {
      const ampCode = feature?.properties?.amp_code ?? '';
      const district = byAmpCode.get(ampCode);
      const selected = district != null && district.id === selectedId;
      const dimOthers = Boolean(selectedId) && selectedId !== 'other' && !selected;
      return {
        // Selection = edge highlight only (keep fee fill; no solid selected square)
        fillColor: district ? amphoeMapFill(district) : '#E8E4DC',
        fillOpacity: selected ? 0.88 : dimOthers ? 0.32 : 0.82,
        color: selected ? '#c5a059' : '#FDFCF8',
        weight: selected ? 3 : 1,
        opacity: 1,
      };
    },
    [byAmpCode, selectedId]
  );

  const onEachFeature = useCallback(
    (
      feature: { properties?: AmphoeFeatureProps },
      layer: {
        on: (events: Record<string, () => void>) => void;
        setStyle: (s: object) => void;
        getBounds?: () => LeafletBounds;
        bindTooltip?: (content: string, options?: object) => void;
      }
    ) => {
      const ampCode = feature.properties?.amp_code ?? '';
      const district = byAmpCode.get(ampCode);
      if (district) {
        layerById.current.set(district.id, layer);
        const label = lang === 'th' ? district.labelTh : district.labelEn;
        layer.bindTooltip?.(label, {
          sticky: true,
          direction: 'top',
          opacity: 0.92,
          className: styles.mapTooltip,
        });
      }
      layer.on({
        click: () => {
          if (district) onSelect(district.id);
        },
        mouseover: () => {
          if (district?.id !== selectedId) {
            layer.setStyle({ weight: 2, color: '#1A3C34' });
          }
        },
        mouseout: () => {
          if (geoJsonRef.current) geoJsonRef.current.resetStyle(layer);
        },
      });
    },
    [byAmpCode, lang, onSelect, selectedId]
  );

  return (
    <MapContainer
      center={CM_CENTER}
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
      <GeoJSON
        key={selectedId || 'none'}
        data={geojson}
        style={styleFor}
        onEachFeature={onEachFeature}
        ref={(ref: typeof geoJsonRef.current) => {
          geoJsonRef.current = ref;
        }}
      />
      <FitProvince />
      <FitSelected />
      <ZoomButtons />
    </MapContainer>
  );
}

export function DeliveryDistrictMap({ lang }: DeliveryDistrictMapProps) {
  const locale = mapLang(lang);
  const t = COPY[locale];
  const selectId = useId();
  const [selected, setSelected] = useState<SelectionId>('');
  const [mounted, setMounted] = useState(false);
  const [geojson, setGeojson] = useState<FeatureCollection<Geometry, AmphoeFeatureProps> | null>(
    null
  );
  const [loadError, setLoadError] = useState<string | null>(null);

  const distanceTiers = useMemo(() => getDeliveryDistanceTiers(), []);

  const districtsSorted = useMemo(() => {
    const collator = new Intl.Collator(locale === 'th' ? 'th' : 'en');
    return [...AMPHOE_MAP_DISTRICTS].sort((a, b) =>
      collator.compare(
        locale === 'th' ? a.labelTh : a.labelEn,
        locale === 'th' ? b.labelTh : b.labelEn
      )
    );
  }, [locale]);

  const byAmpCode = useMemo(() => {
    const map = new Map<string, AmphoeMapDistrict>();
    for (const d of AMPHOE_MAP_DISTRICTS) map.set(d.ampCode, d);
    return map;
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch('/api/maps/chiang-mai-amphoes');
        if (!res.ok) throw new Error('Failed to load map');
        const topology = (await res.json()) as TopologyLike;
        const { feature } = await import('topojson-client');
        const fc = feature(
          topology as never,
          topology.objects.districts as never
        ) as unknown as FeatureCollection<Geometry, AmphoeFeatureProps>;
        if (!cancelled) setGeojson(fc);
      } catch (err) {
        console.error('[DeliveryDistrictMap] load failed:', err);
        if (!cancelled) setLoadError(t.mapLoadError);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [t.mapLoadError]);

  const activate = useCallback((id: SelectionId) => {
    setSelected(id);
  }, []);

  const district =
    selected && selected !== 'other'
      ? AMPHOE_MAP_DISTRICTS.find((d) => d.id === selected)
      : null;

  const isOther = selected === 'other';

  const feeResolved: AmphoeFeeDisplay | null = (() => {
    if (!selected) return null;
    if (isOther) return resolveOtherAmphoeFeeDisplay();
    if (!district) return null;
    return resolveAmphoeFeeDisplay(district);
  })();

  const isDriverConfirm = feeResolved?.displayKind === 'driver_confirm';
  const feeDisplay = feeResolved ? formatAmphoeFeeDisplay(feeResolved, locale) : null;

  const infoTitle = (() => {
    if (!selected) return t.noSelectionTitle;
    if (isOther) return t.otherLabel;
    return lang === 'th' ? district!.labelTh : district!.labelEn;
  })();

  const infoText = (() => {
    if (!selected) return t.noSelectionText;
    if (isOther) {
      return lang === 'th' ? AMPHOE_MAP_OTHER.typicalAreasTh : AMPHOE_MAP_OTHER.typicalAreasEn;
    }
    if (isDriverConfirm) return t.manualText;
    return lang === 'th' ? district!.typicalAreasTh : district!.typicalAreasEn;
  })();

  return (
    <section className={styles.section} aria-labelledby={`${selectId}-title`}>
      <div className={styles.header}>
        <h2 id={`${selectId}-title`} className={styles.title}>
          {t.title}
        </h2>
        <p className={styles.subtitle}>{t.subtitle}</p>
      </div>

      <div className={styles.panel}>
        <div className={styles.controls}>
          <label htmlFor={selectId} className={styles.label}>
            {t.districtLabel}
          </label>
          <select
            id={selectId}
            className={styles.select}
            value={selected}
            onChange={(e) => activate(e.target.value as SelectionId)}
          >
            <option value="">{t.selectPlaceholder}</option>
            {districtsSorted.map((d) => (
              <option key={d.id} value={d.id}>
                {lang === 'th' ? d.labelTh : d.labelEn}
              </option>
            ))}
            <option value="other">{t.otherLabel}</option>
          </select>

          <div className={styles.info} aria-live="polite">
            <strong className={styles.infoTitle}>{infoTitle}</strong>
            {isDriverConfirm && selected ? (
              <span className={styles.driverBadge}>{t.driverBadge}</span>
            ) : null}
            {feeDisplay && selected ? (
              <p className={styles.feeLine}>
                <span className={styles.feeLabel}>
                  {isDriverConfirm ? t.feeLabelEstimate : t.feeLabel}:{' '}
                </span>
                <span
                  className={`${styles.feeAmount} ${isDriverConfirm ? styles.feeAmountEstimate : ''}`}
                >
                  {feeDisplay}
                </span>
              </p>
            ) : null}
            <span className={styles.infoText}>{infoText}</span>
            {selected ? (
              <span className={styles.feeNote}>
                {isDriverConfirm ? t.feeNoteDriver : t.feeNote}
              </span>
            ) : null}
          </div>

          <Link
            href={`/${lang}/catalog`}
            className={`${styles.btn} ${styles.btnPrimary} ${!selected ? styles.btnDisabled : ''}`}
            aria-disabled={!selected}
            tabIndex={!selected ? -1 : undefined}
            onClick={(e) => {
              if (!selected) e.preventDefault();
            }}
          >
            {t.orderCta}
          </Link>
          <Link href={`/${lang}/contact`} className={`${styles.btn} ${styles.btnSecondary}`}>
            {t.contactCta}
          </Link>
        </div>

        <div className={styles.mapArea}>
          <div className={styles.mapStage}>
            <p className={styles.mapHint} aria-hidden={selected ? true : undefined}>
              {t.mapHint}
            </p>
            <div
              className={styles.mapFrame}
              role="img"
              aria-label={
                lang === 'th'
                  ? 'แผนที่อำเภอเชียงใหม่สำหรับเลือกพื้นที่จัดส่ง'
                  : 'Interactive Chiang Mai district map'
              }
            >
              {!mounted || (!geojson && !loadError) ? (
                <div className={styles.mapPlaceholder}>{t.mapLoading}</div>
              ) : loadError || !geojson ? (
                <div className={styles.mapPlaceholder}>{loadError ?? t.mapLoadError}</div>
              ) : (
                <AmphoeLeafletMap
                  geojson={geojson}
                  byAmpCode={byAmpCode}
                  selectedId={selected}
                  onSelect={(id) => activate(id)}
                  lang={lang}
                />
              )}

              {selected && feeDisplay ? (
                <output className={styles.mobileFeeSummary} aria-live="polite">
                  <span className={styles.mobileFeeDistrict}>{infoTitle}</span>
                  {isDriverConfirm ? (
                    <span className={styles.driverBadge}>{t.driverBadge}</span>
                  ) : null}
                  <span className={styles.mobileFeeAmount}>
                    {isDriverConfirm ? t.feeLabelEstimate : t.feeLabel}: {feeDisplay}
                  </span>
                </output>
              ) : null}
            </div>

            <div className={styles.legend} aria-hidden="true">
              <span className={styles.legendLabel}>{t.legendNear}</span>
              <div className={styles.legendBar}>
                {LEGEND_SWATCHES.map((color) => (
                  <span key={color} className={styles.legendSwatch} style={{ background: color }} />
                ))}
              </div>
              <span className={styles.legendLabel}>{t.legendFar}</span>
            </div>
          </div>
        </div>
      </div>

      <details className={styles.tierTable}>
        <summary className={styles.tierTableSummary}>{t.tableSummary}</summary>
        <div className={styles.tierTableWrap}>
          <table className={styles.tierTableEl}>
            <thead>
              <tr>
                <th scope="col">{t.tableDistance}</th>
                <th scope="col">{t.tableFee}</th>
                <th scope="col">{t.tableAreas}</th>
              </tr>
            </thead>
            <tbody>
              {distanceTiers.map((tier) => (
                <tr key={tier.id}>
                  <td>{lang === 'th' ? tier.distanceLabelTh : tier.distanceLabelEn}</td>
                  <td>
                    {tier.feeThb != null ? `฿${tier.feeThb.toLocaleString()}` : t.manualFee}
                  </td>
                  <td>{lang === 'th' ? tier.typicalAreasTh : tier.typicalAreasEn}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className={styles.tierTableFootnote}>{t.tableFootnote}</p>
        </div>
      </details>
    </section>
  );
}
