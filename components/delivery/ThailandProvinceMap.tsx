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
  amphoeMapApiPath,
  destinationIdForAmphoeProvince,
  getAmphoeDistrictsForProvince,
  isAmphoeCapableProvince,
  type AmphoeCapableProvinceCode,
  type ProvinceAmphoeDistrict,
} from '@/lib/delivery/amphoeProvinces';
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
const AMPHOE_FOCUS_MAX_ZOOM = 11;
const AMPHOE_PROVINCE_BOUNDS_PAD = 0.4;

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
  getZoom: () => number;
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
  amphoeProvinceCode,
  selectedCode,
  selectedAmphoeId,
  onSelect,
  onSelectAmphoe,
  lang,
}: {
  geojson: FeatureCollection<Geometry, { NAME_1?: string }>;
  amphoeGeojson: FeatureCollection<Geometry, AmphoeFeatureProps> | null;
  byTopoName: Map<string, ThailandProvinceMapProvince>;
  byAmpCode: Map<string, ProvinceAmphoeDistrict>;
  amphoeProvinceCode: AmphoeCapableProvinceCode | null;
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
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const onSelectAmphoeRef = useRef(onSelectAmphoe);
  onSelectAmphoeRef.current = onSelectAmphoe;
  const showAmphoesRef = useRef(false);
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
    new Map<
      string,
      {
        getBounds?: () => LeafletBounds;
        bringToFront?: () => void;
        bindTooltip?: (content: string, options?: object) => void;
      }
    >()
  );
  const thailandBoundsRef = useRef<LeafletBounds | null>(null);
  const cameraKeyRef = useRef<string>('');
  const showAmphoes =
    amphoeProvinceCode != null &&
    selectedCode === amphoeProvinceCode &&
    amphoeGeojson != null;
  showAmphoesRef.current = showAmphoes;
  const amphoeDestinationId = amphoeProvinceCode
    ? destinationIdForAmphoeProvince(amphoeProvinceCode)
    : 'CHIANG_MAI';
  const amphoeDistricts = amphoeProvinceCode
    ? getAmphoeDistrictsForProvince(amphoeProvinceCode)
    : [];

  function applySoftMaxBounds(map: LeafletMapLike, padRatio: number) {
    const bounds = thailandBoundsRef.current;
    if (!bounds?.isValid()) return;
    map.setMaxBounds(bounds.pad(padRatio));
    map.options.maxBoundsViscosity = 0.6;
  }

  function clearMaxBounds(map: LeafletMapLike) {
    map.setMaxBounds(null);
    map.options.maxBoundsViscosity = 0;
  }

  function applyAmphoeProvinceMaxBounds(
    map: LeafletMapLike,
    collection: FeatureCollection<Geometry, AmphoeFeatureProps>
  ) {
    const bounds = L.geoJSON(collection).getBounds() as LeafletBounds;
    if (!bounds?.isValid()) return;
    map.setMaxBounds(bounds.pad(AMPHOE_PROVINCE_BOUNDS_PAD));
    map.options.maxBoundsViscosity = 0.4;
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

      // Wait for amphoe data before moving (avoids province→amphoe jump fight).
      if (
        amphoeProvinceCode &&
        selectedCode === amphoeProvinceCode &&
        !amphoeGeojson
      ) {
        return;
      }

      let nextKey = 'thailand';
      if (selectedAmphoeId && showAmphoes) {
        nextKey = `amphoe:${selectedAmphoeId}`;
      } else if (amphoeProvinceCode && selectedCode === amphoeProvinceCode && amphoeGeojson) {
        nextKey = `amphoes:${amphoeProvinceCode}`;
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

      if (nextKey.startsWith('amphoe:') && selectedAmphoeId && amphoeGeojson) {
        const abortAmphoeFocus = () => {
          cameraKeyRef.current = '';
        };

        const district = amphoeDistricts.find((d) => d.id === selectedAmphoeId);
        if (!district) {
          abortAmphoeFocus();
          return;
        }

        const live = amphoeLayerById.current.get(selectedAmphoeId)?.getBounds?.();
        let bounds = live && live.isValid() ? live : null;
        if (!bounds) {
          const feature = amphoeGeojson.features.find(
            (f) => String(f.properties?.amp_code ?? '') === district.ampCode
          );
          if (!feature) {
            abortAmphoeFocus();
            return;
          }
          bounds = L.geoJSON(feature).getBounds() as LeafletBounds;
        }
        if (!bounds.isValid()) {
          abortAmphoeFocus();
          return;
        }

        // Country maxBounds pulls northern amphoes farther out — unlock first.
        clearMaxBounds(map);

        const padded = bounds.pad(0.28);
        const fittedZoom = map.getBoundsZoom(padded as never, false);
        const currentZoom = map.getZoom();
        const easedZoom = Number.isFinite(fittedZoom) ? fittedZoom - 0.6 : currentZoom;
        const targetZoom = Math.min(
          AMPHOE_FOCUS_MAX_ZOOM,
          Math.max(easedZoom, currentZoom)
        );
        const center = bounds.getCenter();
        map.setView([center.lat, center.lng], targetZoom, { animate: true });
        applyAmphoeProvinceMaxBounds(map, amphoeGeojson);
        return;
      }

      applySoftMaxBounds(map, 0.55);

      if (nextKey.startsWith('amphoes:') && amphoeGeojson) {
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
    district: ProvinceAmphoeDistrict
  ) {
    const selectedId = selectedAmphoeIdRef.current;
    const selected = district.id === selectedId;
    const dimOthers = Boolean(selectedId) && !selected;
    layer.setStyle?.({
      fillColor: amphoeMapFill(district, amphoeDestinationId),
      fillOpacity: selected ? 0.96 : dimOthers ? 0.22 : 0.78,
      color: selected
        ? '#1A3C34'
        : dimOthers
          ? 'rgba(253, 252, 248, 0.3)'
          : 'rgba(26, 60, 52, 0.18)',
      weight: selected ? 3.75 : dimOthers ? 0.45 : 0.75,
      opacity: 1,
      dashArray: selected ? '9 4 2 4' : null,
    });
    const pathEl = layer.getElement?.() ?? layer._path;
    if (pathEl instanceof Element) {
      pathEl.classList.toggle(styles.amphoeSelected, selected);
    }
    if (selected) layer.bringToFront?.();
  }

  function SyncAmphoeStyles() {
    useEffect(() => {
      for (const [id, layer] of Array.from(amphoeLayerById.current.entries())) {
        const district = amphoeDistricts.find((d) => d.id === id);
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
      for (const layer of Array.from(amphoeLayerById.current.values())) {
        layer.bringToFront?.();
      }
      if (selectedAmphoeId) {
        amphoeLayerById.current.get(selectedAmphoeId)?.bringToFront?.();
      }
    }, [showAmphoes, selectedAmphoeId, amphoeGeojson]);
    return null;
  }

  /** Empty-map tap: clear province in overview; in amphoe mode only clear district highlight. */
  function ClearSelectionOnBackgroundClick() {
    const map = useMap();
    useEffect(() => {
      const handler = (e: { originalEvent?: Event }) => {
        const target = e.originalEvent?.target;
        if (!(target instanceof Element)) return;
        if (target.closest('.leaflet-interactive')) return;
        if (target.closest('button, a, input, textarea, select, [role="button"]')) return;
        if (target.closest(`.${styles.zoomControls}`)) return;
        if (target.closest(`.${styles.selectionChip}`)) return;
        if (target.closest(`.${styles.infoOverlay}`)) return;
        if (showAmphoesRef.current) {
          // Stay in amphoe drill-down — only drop district highlight if any.
          if (selectedAmphoeIdRef.current) onSelectAmphoeRef.current(null);
          return;
        }
        onSelectRef.current('');
        onSelectAmphoeRef.current(null);
      };
      map.on('click', handler);
      return () => {
        map.off('click', handler);
      };
    }, [map]);
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
        fillColor: district ? amphoeMapFill(district, amphoeDestinationId) : '#E8E4DC',
        fillOpacity: selected ? 0.96 : dimOthers ? 0.22 : 0.78,
        color: selected
          ? '#1A3C34'
          : dimOthers
            ? 'rgba(253, 252, 248, 0.3)'
            : 'rgba(26, 60, 52, 0.18)',
        weight: selected ? 3.75 : dimOthers ? 0.45 : 0.75,
        opacity: 1,
        dashArray: selected ? '9 4 2 4' : undefined,
        className: selected ? styles.amphoeSelected : '',
        lineJoin: 'round' as const,
        lineCap: 'round' as const,
      };
    },
    [byAmpCode, selectedAmphoeId, amphoeDestinationId]
  );

  const onEachFeature = useCallback(
    (
      feature: { properties?: { NAME_1?: string } },
      layer: {
        on: (events: Record<string, () => void>) => void;
        setStyle: (s: object) => void;
        getBounds?: () => LeafletBounds;
        bringToFront?: () => void;
        bindTooltip?: (content: string, options?: object) => void;
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
        if (!showAmphoes) {
          const label =
            lang === 'th' ? province.province_name_th : province.province_name_en;
          const isSelected = province.province_code === selectedCode;
          layer.bindTooltip?.(label, {
            sticky: !isSelected,
            permanent: isSelected,
            direction: isSelected ? 'center' : 'top',
            opacity: 0.92,
            className: styles.provinceTooltip,
            interactive: false,
          });
        }
      }
      if (showAmphoes) return;
      layer.on({
        click: () => {
          // Select only — never toggle off by re-clicking the same province.
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
    [byTopoName, onSelect, selectedCode, showAmphoes, lang]
  );

  const onEachAmphoe = useCallback(
    (
      feature: { properties?: AmphoeFeatureProps },
      layer: {
        on: (events: Record<string, (e: { originalEvent?: Event }) => void>) => void;
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
        click: (e: { originalEvent?: Event }) => {
          L.DomEvent.stopPropagation(e);
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
        key={`prov-${selectedCode ?? 'none'}-${showAmphoes ? amphoeProvinceCode : 'all'}`}
        data={geojson}
        style={styleFor}
        onEachFeature={onEachFeature}
        ref={(ref: typeof geoJsonRef.current) => {
          geoJsonRef.current = ref;
        }}
      />
      {showAmphoes && amphoeGeojson ? (
        <GeoJSON
          key={`${amphoeProvinceCode}-amphoes`}
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
      <ClearSelectionOnBackgroundClick />
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
  const [loadedAmphoeProvince, setLoadedAmphoeProvince] = useState<AmphoeCapableProvinceCode | null>(
    null
  );
  const [loadError, setLoadError] = useState<string | null>(null);
  const [internalSelected, setInternalSelected] = useState<string | null>(null);
  const [internalAmphoeId, setInternalAmphoeId] = useState<string | null>(null);

  const selectedCode = controlledSelected !== undefined ? controlledSelected : internalSelected;
  const amphoeId =
    controlledAmphoeId !== undefined ? controlledAmphoeId : internalAmphoeId;
  const isTh = lang === 'th';
  const amphoeProvinceCode: AmphoeCapableProvinceCode | null =
    selectedCode && isAmphoeCapableProvince(selectedCode)
      ? (selectedCode as AmphoeCapableProvinceCode)
      : null;

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
    if (!amphoeProvinceCode) {
      if (controlledAmphoeId === undefined) setInternalAmphoeId(null);
      setAmphoeGeojson(null);
      setLoadedAmphoeProvince(null);
      return;
    }
    if (loadedAmphoeProvince === amphoeProvinceCode && amphoeGeojson) return;

    let cancelled = false;
    async function loadAmphoes() {
      try {
        const res = await fetch(amphoeMapApiPath(amphoeProvinceCode!));
        if (!res.ok) throw new Error('Failed to load amphoes');
        const topology = (await res.json()) as TopologyLike;
        const { feature } = await import('topojson-client');
        const fc = feature(
          topology as never,
          topology.objects.districts as never
        ) as unknown as FeatureCollection<Geometry, AmphoeFeatureProps>;
        if (!cancelled) {
          setAmphoeGeojson(fc);
          setLoadedAmphoeProvince(amphoeProvinceCode);
        }
      } catch (err) {
        console.error('[ThailandProvinceMap] amphoe load failed:', err);
      }
    }
    void loadAmphoes();
    return () => {
      cancelled = true;
    };
  }, [amphoeProvinceCode, amphoeGeojson, loadedAmphoeProvince, controlledAmphoeId]);

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
    const map = new Map<string, ProvinceAmphoeDistrict>();
    if (!amphoeProvinceCode) return map;
    for (const d of getAmphoeDistrictsForProvince(amphoeProvinceCode)) {
      map.set(d.ampCode, d);
    }
    return map;
  }, [amphoeProvinceCode]);

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
      // Keep amphoe selection only when staying on the same amphoe-capable province
      // (admin form relies on province selection not being cleared by amphoe clicks).
      if (!next || !isAmphoeCapableProvince(next) || next !== selectedCode) {
        setAmphoeId(null);
      }
    },
    [controlledSelected, onSelectProvince, setAmphoeId, selectedCode]
  );

  const selectedAmphoeDistrict = useMemo(() => {
    if (!amphoeProvinceCode || !amphoeId) return null;
    return (
      getAmphoeDistrictsForProvince(amphoeProvinceCode).find((d) => d.id === amphoeId) ??
      null
    );
  }, [amphoeProvinceCode, amphoeId]);

  function clearCurrentSelection() {
    if (amphoeId) {
      setAmphoeId(null);
      return;
    }
    handleSelect('');
  }

  const selectionChipLabel = selectedAmphoeDistrict
    ? isTh
      ? selectedAmphoeDistrict.labelTh
      : selectedAmphoeDistrict.labelEn
    : selected
      ? isTh
        ? selected.province_name_th
        : selected.province_name_en
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
            amphoeGeojson={
              loadedAmphoeProvince === amphoeProvinceCode ? amphoeGeojson : null
            }
            byTopoName={byTopoName}
            byAmpCode={byAmpCode}
            amphoeProvinceCode={amphoeProvinceCode}
            selectedCode={selectedCode}
            selectedAmphoeId={amphoeId}
            onSelect={handleSelect}
            onSelectAmphoe={setAmphoeId}
            lang={lang}
          />
        )}

        {selectionChipLabel ? (
          <div className={styles.selectionChip}>
            <span className={styles.selectionChipLabel}>{selectionChipLabel}</span>
            <button
              type="button"
              className={styles.selectionChipClose}
              onClick={clearCurrentSelection}
              aria-label={
                amphoeId
                  ? isTh
                    ? 'ปิดการเลือกพื้นที่'
                    : 'Close area selection'
                  : isTh
                    ? 'ปิดการเลือกจังหวัด'
                    : 'Close province selection'
              }
            >
              <span aria-hidden>×</span>
            </button>
          </div>
        ) : null}

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
