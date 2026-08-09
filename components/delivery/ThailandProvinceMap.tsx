'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FeatureCollection, Geometry } from 'geojson';
import 'leaflet/dist/leaflet.css';
import type { Locale } from '@/lib/i18n';
import type { PublicProvince } from '@/lib/provinces/types';
import {
  getProvinceStatusFillColor,
  getProvinceStatusLabel,
  PROVINCE_STATUS_LEGEND,
} from '@/lib/provinces/statusColors';
import { TOPOJSON_LAKE_ALIASES } from '@/lib/provinces/seedRoster';
import { amphoeMapFill } from '@/lib/delivery/amphoeDisplayFees';
import {
  AMPHOE_MAP_DISTRICTS,
  type AmphoeMapDistrict,
} from '@/lib/delivery/amphoeMapData';
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
  /** Controlled amphoe selection (e.g. synced with the coverage side list). */
  selectedAmphoeId?: string | null;
  onSelectAmphoe?: (id: string | null) => void;
  className?: string;
};

const THAILAND_CENTER: [number, number] = [13.5, 101.0];
const DEFAULT_ZOOM = 5.6;
const MIN_ZOOM = 5;
const MAX_ZOOM = 13;
const AMPHOE_FOCUS_ZOOM = 9;
const CHIANG_MAI_CODE = 'chiang-mai';

type TopologyLike = {
  type: string;
  objects: { province?: unknown; districts?: unknown };
  arcs: unknown;
};

type AmphoeFeatureProps = {
  amp_code?: string;
  amp_en?: string;
  amp_th?: string;
};

type LeafletBounds = {
  isValid: () => boolean;
  pad: (bufferRatio: number) => LeafletBounds;
  getCenter: () => { lat: number; lng: number };
};

type LeafletMapLike = {
  fitBounds: (bounds: unknown, options?: object) => void;
  setView: (center: [number, number], zoom: number, options?: object) => void;
  setMaxBounds: (bounds: unknown) => void;
  setMinZoom: (zoom: number) => void;
  getBoundsZoom: (bounds: unknown, inside?: boolean) => number;
  stop: () => void;
  options: { maxBoundsViscosity?: number };
};

function resolveTopoName(name: string): string {
  return TOPOJSON_LAKE_ALIASES[name] ?? name;
}

function MapInner({
  geojson,
  amphoeGeojson,
  byTopoName,
  byAmpCode,
  selectedCode,
  selectedAmphoeId,
  onSelect,
  onSelectAmphoe,
  lang,
}: {
  geojson: FeatureCollection<Geometry, { NAME_1?: string }>;
  amphoeGeojson: FeatureCollection<Geometry, AmphoeFeatureProps> | null;
  byTopoName: Map<string, ThailandProvinceMapProvince>;
  byAmpCode: Map<string, AmphoeMapDistrict>;
  selectedCode: string | null;
  selectedAmphoeId: string | null;
  onSelect: (code: string) => void;
  onSelectAmphoe: (id: string | null) => void;
  lang: Locale;
}) {
  const { MapContainer, GeoJSON, useMap } = require('react-leaflet');
  const L = require('leaflet');
  const geoJsonRef = useRef<{ resetStyle: (layer?: unknown) => void } | null>(null);
  const amphoeGeoJsonRef = useRef<{ resetStyle: (layer?: unknown) => void } | null>(null);
  const selectedAmphoeIdRef = useRef(selectedAmphoeId);
  selectedAmphoeIdRef.current = selectedAmphoeId;
  const onSelectAmphoeRef = useRef(onSelectAmphoe);
  onSelectAmphoeRef.current = onSelectAmphoe;
  const amphoeLayerById = useRef(
    new Map<
      string,
      {
        getBounds?: () => LeafletBounds;
        setStyle?: (s: object) => void;
        bringToFront?: () => void;
      }
    >()
  );
  const layerByCode = useRef(
    new Map<string, { getBounds?: () => LeafletBounds; bringToFront?: () => void }>()
  );
  const thailandBoundsRef = useRef<LeafletBounds | null>(null);
  const cameraKeyRef = useRef<string>('');
  const showAmphoes = selectedCode === CHIANG_MAI_CODE && amphoeGeojson != null;

  function applySoftMaxBounds(map: LeafletMapLike, padRatio: number) {
    const bounds = thailandBoundsRef.current;
    if (!bounds?.isValid()) return;
    // Generous pad avoids north-border amphoes fighting maxBounds (which forced zoom-out).
    map.setMaxBounds(bounds.pad(padRatio));
    map.options.maxBoundsViscosity = 0.6;
  }

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

  /**
   * Single camera owner — replaces FitThailand / FitSelected / FitSelectedAmphoe.
   * Priority: amphoe focus > Chiang Mai overview > province > Thailand.
   */
  function MapCamera() {
    const map = useMap() as LeafletMapLike;
    const didInitRef = useRef(false);

    useEffect(() => {
      const thailandLayer = L.geoJSON(geojson);
      const thailandBounds = thailandLayer.getBounds() as LeafletBounds;
      if (!thailandBounds.isValid()) return;
      thailandBoundsRef.current = thailandBounds;

      // Wait for CM amphoe data before moving (avoids province→amphoe jump fight).
      if (selectedCode === CHIANG_MAI_CODE && !amphoeGeojson) {
        return;
      }

      let nextKey = 'thailand';
      if (selectedAmphoeId && showAmphoes) {
        nextKey = `amphoe:${selectedAmphoeId}`;
      } else if (selectedCode === CHIANG_MAI_CODE && amphoeGeojson) {
        nextKey = 'cm:amphoes';
      } else if (selectedCode) {
        nextKey = `province:${selectedCode}`;
      }

      if (cameraKeyRef.current === nextKey) return;
      cameraKeyRef.current = nextKey;

      map.stop();

      if (nextKey === 'thailand') {
        applySoftMaxBounds(map, 0.18);
        map.fitBounds(thailandBounds as never, {
          padding: [8, 8],
          animate: didInitRef.current,
        });
        didInitRef.current = true;
        const fittedZoom = map.getBoundsZoom(thailandBounds as never, false);
        if (Number.isFinite(fittedZoom)) {
          map.setMinZoom(Math.max(MIN_ZOOM, fittedZoom - 0.15));
        }
        return;
      }

      didInitRef.current = true;
      applySoftMaxBounds(map, 0.55);

      if (nextKey.startsWith('amphoe:') && selectedAmphoeId && amphoeGeojson) {
        const district = AMPHOE_MAP_DISTRICTS.find((d) => d.id === selectedAmphoeId);
        if (!district) return;

        const live = amphoeLayerById.current.get(selectedAmphoeId)?.getBounds?.();
        let bounds = live && live.isValid() ? live : null;
        if (!bounds) {
          const feature = amphoeGeojson.features.find(
            (f) => String(f.properties?.amp_code ?? '') === district.ampCode
          );
          if (!feature) return;
          bounds = L.geoJSON(feature).getBounds() as LeafletBounds;
        }
        if (!bounds.isValid()) return;

        const center = bounds.getCenter();
        map.setView([center.lat, center.lng], AMPHOE_FOCUS_ZOOM, { animate: true });
        return;
      }

      if (nextKey === 'cm:amphoes' && amphoeGeojson) {
        const amphoeBounds = L.geoJSON(amphoeGeojson).getBounds() as LeafletBounds;
        if (!amphoeBounds.isValid()) return;
        map.fitBounds(amphoeBounds as never, {
          padding: [16, 16],
          maxZoom: 10.5,
          animate: true,
        });
        return;
      }

      if (selectedCode) {
        const layer = layerByCode.current.get(selectedCode);
        const bounds = layer?.getBounds?.();
        if (bounds?.isValid()) {
          map.fitBounds(bounds as never, {
            padding: [28, 28],
            maxZoom: 8.5,
            animate: true,
          });
          return;
        }
        // Layers may not be registered yet on first paint — retry once after paint.
        const code = selectedCode;
        const t = window.setTimeout(() => {
          const retry = layerByCode.current.get(code)?.getBounds?.();
          if (retry?.isValid()) {
            map.fitBounds(retry as never, {
              padding: [28, 28],
              maxZoom: 8.5,
              animate: true,
            });
          }
        }, 50);
        return () => window.clearTimeout(t);
      }
    }, [map, selectedCode, selectedAmphoeId, amphoeGeojson, showAmphoes]);

    return null;
  }

  /** Base amphoe style from current selection — used by sync + mouseout (avoid resetStyle leaks). */
  function styleAmphoeLayer(
    layer: {
      setStyle?: (s: object) => void;
      bringToFront?: () => void;
      getElement?: () => Element | undefined;
      _path?: Element;
    },
    district: AmphoeMapDistrict
  ) {
    const selectedId = selectedAmphoeIdRef.current;
    const selected = district.id === selectedId;
    const dimOthers = Boolean(selectedId) && !selected;
    layer.setStyle?.({
      fillColor: amphoeMapFill(district),
      fillOpacity: selected ? 0.96 : dimOthers ? 0.22 : 0.78,
      color: selected
        ? '#1A3C34'
        : dimOthers
          ? 'rgba(253, 252, 248, 0.3)'
          : 'rgba(26, 60, 52, 0.18)',
      weight: selected ? 3.75 : dimOthers ? 0.45 : 0.75,
      opacity: 1,
    });
    const pathEl = layer.getElement?.() ?? layer._path;
    if (pathEl instanceof Element) {
      pathEl.classList.toggle(styles.amphoeSelected, selected);
    }
    if (selected) layer.bringToFront?.();
  }

  function SyncAmphoeStyles() {
    useEffect(() => {
      for (const [id, layer] of amphoeLayerById.current) {
        const district = AMPHOE_MAP_DISTRICTS.find((d) => d.id === id);
        if (!district) continue;
        styleAmphoeLayer(layer, district);
      }
    }, [selectedAmphoeId, showAmphoes, amphoeGeojson]);
    return null;
  }

  function BringSelectedProvinceForward() {
    useEffect(() => {
      if (!selectedCode || showAmphoes) return;
      layerByCode.current.get(selectedCode)?.bringToFront?.();
    }, [selectedCode, showAmphoes]);
    return null;
  }

  function KeepAmphoesOnTop() {
    useEffect(() => {
      if (!showAmphoes) return;
      for (const layer of amphoeLayerById.current.values()) {
        layer.bringToFront?.();
      }
      if (selectedAmphoeId) {
        amphoeLayerById.current.get(selectedAmphoeId)?.bringToFront?.();
      }
    }, [showAmphoes, selectedAmphoeId, amphoeGeojson]);
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
      const cmWithAmphoes = selected && showAmphoes;
      return {
        fillColor: province
          ? getProvinceStatusFillColor(province.status)
          : isLake
            ? '#A8C8D8'
            : '#E8E4DC',
        fillOpacity: isLake
          ? 0.35
          : cmWithAmphoes
            ? 0.12
            : selected
              ? 0.95
              : dimOthers
                ? 0.28
                : 0.78,
        // Soft shared edges so neighbor white strokes do not cover the selection ring
        color: selected ? '#1A3C34' : dimOthers ? 'rgba(253, 252, 248, 0.35)' : 'rgba(26, 60, 52, 0.18)',
        weight: selected ? 2.75 : dimOthers ? 0.4 : 0.65,
        opacity: 1,
        // Let amphoe paths receive hover while CM drill-down is open
        interactive: !showAmphoes,
        lineJoin: 'round' as const,
        lineCap: 'round' as const,
      };
    },
    [byTopoName, selectedCode, showAmphoes]
  );

  const amphoeStyleFor = useCallback(
    (feature?: { properties?: AmphoeFeatureProps }) => {
      const ampCode = String(feature?.properties?.amp_code ?? '');
      const district = byAmpCode.get(ampCode);
      const selected = district != null && district.id === selectedAmphoeId;
      const dimOthers = Boolean(selectedAmphoeId) && !selected;
      return {
        fillColor: district ? amphoeMapFill(district) : '#E8E4DC',
        fillOpacity: selected ? 0.96 : dimOthers ? 0.22 : 0.78,
        color: selected
          ? '#1A3C34'
          : dimOthers
            ? 'rgba(253, 252, 248, 0.3)'
            : 'rgba(26, 60, 52, 0.18)',
        weight: selected ? 3.75 : dimOthers ? 0.45 : 0.75,
        opacity: 1,
        className: selected ? styles.amphoeSelected : '',
        lineJoin: 'round' as const,
        lineCap: 'round' as const,
      };
    },
    [byAmpCode, selectedAmphoeId]
  );

  const onEachFeature = useCallback(
    (
      feature: { properties?: { NAME_1?: string } },
      layer: {
        on: (events: Record<string, () => void>) => void;
        setStyle: (s: object) => void;
        getBounds?: () => LeafletBounds;
        bringToFront?: () => void;
      }
    ) => {
      const rawName = feature.properties?.NAME_1 ?? '';
      const name = resolveTopoName(rawName);
      const province = byTopoName.get(name);
      if (province) {
        layerByCode.current.set(province.province_code, layer);
        if (province.province_code === selectedCode && !showAmphoes) {
          layer.bringToFront?.();
        }
      }
      if (showAmphoes) return;
      layer.on({
        click: () => {
          if (province) onSelect(province.province_code);
        },
        mouseover: () => {
          // Stroke-only — do not change fillColor/fillOpacity (leaks into amphoe view).
          if (province?.province_code !== selectedCode) {
            layer.setStyle({ weight: 1.4, color: 'rgba(26, 60, 52, 0.55)' });
            layer.bringToFront?.();
          }
        },
        mouseout: () => {
          if (geoJsonRef.current) {
            geoJsonRef.current.resetStyle(layer);
          }
          const selectedLayer = selectedCode
            ? layerByCode.current.get(selectedCode)
            : undefined;
          selectedLayer?.bringToFront?.();
        },
      });
    },
    [byTopoName, onSelect, selectedCode, showAmphoes]
  );

  const onEachAmphoe = useCallback(
    (
      feature: { properties?: AmphoeFeatureProps },
      layer: {
        on: (events: Record<string, () => void>) => void;
        setStyle: (s: object) => void;
        getBounds?: () => LeafletBounds;
        bindTooltip?: (content: string, options?: object) => void;
        bringToFront?: () => void;
        getElement?: () => Element | undefined;
        _path?: Element;
      }
    ) => {
      const ampCode = String(feature.properties?.amp_code ?? '');
      const district = byAmpCode.get(ampCode);
      if (district) {
        amphoeLayerById.current.set(district.id, layer);
        styleAmphoeLayer(layer, district);
        const label = lang === 'th' ? district.labelTh : district.labelEn;
        layer.bindTooltip?.(label, {
          sticky: true,
          direction: 'top',
          opacity: 0.92,
          className: styles.amphoeTooltip,
        });
      }
      layer.on({
        click: () => {
          if (!district) return;
          const selectedId = selectedAmphoeIdRef.current;
          onSelectAmphoeRef.current(
            district.id === selectedId ? null : district.id
          );
        },
        mouseover: () => {
          // Stroke-only hover — never change fill (fill stuck after resetStyle before).
          const selectedId = selectedAmphoeIdRef.current;
          if (!district || district.id === selectedId) return;
          layer.setStyle({
            weight: 2.25,
            color: '#1A3C34',
          });
          layer.bringToFront?.();
        },
        mouseout: () => {
          if (district) styleAmphoeLayer(layer, district);
          const selectedId = selectedAmphoeIdRef.current;
          if (selectedId) {
            amphoeLayerById.current.get(selectedId)?.bringToFront?.();
          }
        },
      });
    },
    [byAmpCode, lang]
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
      <GeoJSON
        key={`prov-${selectedCode ?? 'none'}-${showAmphoes ? 'cm' : 'all'}`}
        data={geojson}
        style={styleFor}
        onEachFeature={onEachFeature}
        ref={(ref: typeof geoJsonRef.current) => {
          geoJsonRef.current = ref;
        }}
      />
      {showAmphoes && amphoeGeojson ? (
        <GeoJSON
          key="chiang-mai-amphoes"
          data={amphoeGeojson}
          style={amphoeStyleFor}
          onEachFeature={onEachAmphoe}
          ref={(ref: typeof amphoeGeoJsonRef.current) => {
            amphoeGeoJsonRef.current = ref;
            if (!ref) amphoeLayerById.current.clear();
          }}
        />
      ) : null}
      <MapCamera />
      <SyncAmphoeStyles />
      <BringSelectedProvinceForward />
      <KeepAmphoesOnTop />
      <ZoomButtons />
    </MapContainer>
  );
}

export function ThailandProvinceMap({
  mode,
  provinces,
  lang = 'en',
  selectedCode: controlledSelected,
  onSelectProvince,
  selectedAmphoeId: controlledAmphoeId,
  onSelectAmphoe,
  className,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [geojson, setGeojson] = useState<FeatureCollection<Geometry, { NAME_1?: string }> | null>(
    null
  );
  const [amphoeGeojson, setAmphoeGeojson] = useState<FeatureCollection<
    Geometry,
    AmphoeFeatureProps
  > | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [internalSelected, setInternalSelected] = useState<string | null>(null);
  const [internalAmphoeId, setInternalAmphoeId] = useState<string | null>(null);

  const selectedCode = controlledSelected !== undefined ? controlledSelected : internalSelected;
  const amphoeId =
    controlledAmphoeId !== undefined ? controlledAmphoeId : internalAmphoeId;
  const isTh = lang === 'th';

  const setAmphoeId = useCallback(
    (id: string | null) => {
      if (controlledAmphoeId === undefined) setInternalAmphoeId(id);
      onSelectAmphoe?.(id);
    },
    [controlledAmphoeId, onSelectAmphoe]
  );

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

  useEffect(() => {
    if (selectedCode !== CHIANG_MAI_CODE) {
      if (controlledAmphoeId === undefined) setInternalAmphoeId(null);
      return;
    }
    if (amphoeGeojson) return;

    let cancelled = false;
    async function loadAmphoes() {
      try {
        const res = await fetch('/api/maps/chiang-mai-amphoes');
        if (!res.ok) throw new Error('Failed to load amphoes');
        const topology = (await res.json()) as TopologyLike;
        const { feature } = await import('topojson-client');
        const fc = feature(
          topology as never,
          topology.objects.districts as never
        ) as unknown as FeatureCollection<Geometry, AmphoeFeatureProps>;
        if (!cancelled) setAmphoeGeojson(fc);
      } catch (err) {
        console.error('[ThailandProvinceMap] amphoe load failed:', err);
      }
    }
    void loadAmphoes();
    return () => {
      cancelled = true;
    };
  }, [selectedCode, amphoeGeojson, controlledAmphoeId]);

  const byTopoName = useMemo(() => {
    const map = new Map<string, ThailandProvinceMapProvince>();
    for (const p of provinces) {
      if (p.topojson_property_value) {
        map.set(p.topojson_property_value, p);
      }
    }
    return map;
  }, [provinces]);

  const byAmpCode = useMemo(() => {
    const map = new Map<string, AmphoeMapDistrict>();
    for (const d of AMPHOE_MAP_DISTRICTS) {
      map.set(d.ampCode, d);
    }
    return map;
  }, []);

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
      if (next !== CHIANG_MAI_CODE) setAmphoeId(null);
    },
    [controlledSelected, onSelectProvince, setAmphoeId]
  );

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
            amphoeGeojson={amphoeGeojson}
            byTopoName={byTopoName}
            byAmpCode={byAmpCode}
            selectedCode={selectedCode}
            selectedAmphoeId={amphoeId}
            onSelect={handleSelect}
            onSelectAmphoe={setAmphoeId}
            lang={lang}
          />
        )}

        {mode === 'admin' && selected ? (
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
                  {getProvinceStatusLabel(selected.status)}
                </span>
              </div>
            </div>
            <p className={styles.infoAdminHint}>
              Editing panel follows selection · {selected.province_code}
            </p>
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
