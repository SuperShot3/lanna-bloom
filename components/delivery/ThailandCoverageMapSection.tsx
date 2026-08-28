'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import type { Locale } from '@/lib/i18n';
import '@/app/[lang]/info/guide.css';
import type { PublicProvince } from '@/lib/provinces/types';
import {
  getProvinceStatusFillColor,
  getProvinceStatusLabel,
} from '@/lib/provinces/statusColors';
import {
  buildCoveragePanelDisplay,
  filterProvincesBySearch,
  sortProvincesForCoverageList,
} from '@/lib/delivery/coverageDisplay';
import { canEnterCatalog } from '@/lib/provinces/shopAccess';
import { getAmphoeDrillItems } from '@/lib/delivery/amphoeMapDrilldown';
import {
  destinationIdForAmphoeProvince,
  isAmphoeCapableProvince,
  type AmphoeCapableProvinceCode,
} from '@/lib/delivery/amphoeProvinces';
import { amphoeMapFill } from '@/lib/delivery/amphoeDisplayFees';
import { formatFeeRange } from '@/lib/delivery/distanceTiers';
import Link from 'next/link';

const ThailandProvinceMap = dynamic(
  () =>
    import('@/components/delivery/ThailandProvinceMap').then((m) => m.ThailandProvinceMap),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          minHeight: 320,
          display: 'grid',
          placeItems: 'center',
          borderRadius: '1.25rem',
          background: 'linear-gradient(160deg, #e8f0ec 0%, #f4efe6 55%, #e7e2d8 100%)',
          color: '#5c655f',
          fontSize: '0.95rem',
        }}
      >
        Loading map…
      </div>
    ),
  }
);

export function ThailandCoverageMapSection({
  lang,
  initialProvinces,
  title,
  intro,
}: {
  lang: Locale;
  initialProvinces: PublicProvince[];
  title?: string;
  intro?: string;
}) {
  const [provinces, setProvinces] = useState(initialProvinces);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [selectedAmphoeId, setSelectedAmphoeId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const amphoeListRef = useRef<HTMLUListElement>(null);
  const isTh = lang === 'th';
  const amphoeProvinceCode: AmphoeCapableProvinceCode | null =
    selectedCode && isAmphoeCapableProvince(selectedCode)
      ? (selectedCode as AmphoeCapableProvinceCode)
      : null;
  const showingAmphoes = amphoeProvinceCode != null;
  const amphoeDestinationId = amphoeProvinceCode
    ? destinationIdForAmphoeProvince(amphoeProvinceCode)
    : 'CHIANG_MAI';

  useEffect(() => {
    let cancelled = false;
    async function refresh() {
      try {
        const res = await fetch('/api/provinces', { cache: 'no-store' });
        if (!res.ok) return;
        const data = (await res.json()) as { provinces?: PublicProvince[] };
        if (!cancelled && Array.isArray(data.provinces) && data.provinces.length > 0) {
          setProvinces(data.provinces);
        }
      } catch {
        /* keep SSR/initial data */
      }
    }
    void refresh();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!showingAmphoes) setSelectedAmphoeId(null);
  }, [showingAmphoes]);

  useEffect(() => {
    setSearch('');
  }, [showingAmphoes]);

  const sorted = useMemo(
    () => sortProvincesForCoverageList(provinces, lang),
    [provinces, lang]
  );

  const filteredProvinces = useMemo(
    () => filterProvincesBySearch(sorted, search),
    [sorted, search]
  );

  const amphoeItems = useMemo(
    () =>
      amphoeProvinceCode ? getAmphoeDrillItems(amphoeProvinceCode, lang) : [],
    [amphoeProvinceCode, lang]
  );

  const filteredAmphoes = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return amphoeItems;
    return amphoeItems.filter(({ amphoe, subAreas }) => {
      const en = amphoe.labelEn.toLowerCase();
      const th = amphoe.labelTh.toLowerCase();
      if (en.includes(q) || th.includes(q)) return true;
      return subAreas.some(
        (area) =>
          area.labelEn.toLowerCase().includes(q) || area.labelTh.toLowerCase().includes(q)
      );
    });
  }, [amphoeItems, search]);

  const selectedProvince = useMemo(
    () => provinces.find((p) => p.province_code === selectedCode) ?? null,
    [provinces, selectedCode]
  );

  const selectedCoverage = useMemo(
    () =>
      selectedProvince ? buildCoveragePanelDisplay(selectedProvince, lang) : null,
    [selectedProvince, lang]
  );

  const selectedAmphoeItem = useMemo(
    () => amphoeItems.find(({ amphoe }) => amphoe.id === selectedAmphoeId) ?? null,
    [amphoeItems, selectedAmphoeId]
  );

  useEffect(() => {
    if (!selectedAmphoeId || !amphoeListRef.current) return;
    const el = amphoeListRef.current.querySelector<HTMLElement>(
      `[data-amphoe-id="${selectedAmphoeId}"]`
    );
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [selectedAmphoeId]);

  function clearSelection() {
    if (selectedAmphoeId) {
      setSelectedAmphoeId(null);
      return;
    }
    setSelectedCode(null);
    setSelectedAmphoeId(null);
  }

  if (provinces.length === 0) return null;

  const serviceSummary =
    selectedProvince && selectedCoverage ? (
      <div
        className="mb-3 rounded-xl border border-stone-200/90 bg-white px-3 py-2.5"
        role="status"
        aria-live="polite"
      >
        <div className="flex items-start gap-2.5">
          <span
            className="mt-0.5 w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{
              background: selectedAmphoeItem
                ? amphoeMapFill(selectedAmphoeItem.amphoe, amphoeDestinationId)
                : getProvinceStatusFillColor(selectedProvince.status),
            }}
            aria-hidden
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-[#1A3C34] leading-snug">
              <span className="font-medium text-stone-500">
                {isTh ? 'จังหวัด: ' : 'Province: '}
              </span>
              {isTh
                ? selectedProvince.province_name_th
                : selectedProvince.province_name_en}
            </p>
            {selectedAmphoeItem ? (
              <p className="text-sm font-semibold text-[#1A3C34] leading-snug mt-0.5">
                <span className="font-medium text-stone-500">
                  {isTh ? 'อำเภอ: ' : 'Amphoe: '}
                </span>
                {isTh
                  ? selectedAmphoeItem.amphoe.labelTh
                  : selectedAmphoeItem.amphoe.labelEn}
              </p>
            ) : null}
            <p className="text-xs font-medium text-[#1A3C34] mt-1.5">
              {getProvinceStatusLabel(selectedProvince.status)}
              {selectedProvince.catalog_enabled
                ? isTh
                  ? ' · เปิดแคตตาล็อก'
                  : ' · Catalog open'
                : ''}
            </p>
            {selectedCoverage.timingLine ? (
              <p className="text-xs text-stone-500 mt-1">{selectedCoverage.timingLine}</p>
            ) : null}
            {selectedCoverage.cutoffLine ? (
              <p className="text-xs text-stone-500 mt-0.5">{selectedCoverage.cutoffLine}</p>
            ) : null}
            {selectedAmphoeItem ? (
              <p className="text-xs font-semibold text-[#1A3C34] mt-1">
                {isTh ? 'ค่าจัดส่ง: ' : 'Delivery fee: '}
                {selectedAmphoeItem.feeLabel}
              </p>
            ) : null}
            {selectedCoverage.blockedNotice ? (
              <p className="text-xs text-stone-500 mt-1">{selectedCoverage.blockedNotice}</p>
            ) : null}
            {selectedCoverage.shoppable ? (
              <Link
                href={selectedCoverage.catalogHref}
                className="btn-premium mt-2.5 !min-h-0 h-auto py-1.5 px-3 text-[11px] rounded-lg"
              >
                {isTh ? 'ดูแคตตาล็อก' : 'Browse catalog'}
              </Link>
            ) : selectedCoverage.showPartnerCta ? (
              <Link
                href={selectedCoverage.partnerApplyHref}
                className="btn-premium mt-2.5 !min-h-0 h-auto py-1.5 px-3 text-[11px] rounded-lg"
              >
                {isTh ? 'สมัครพาร์ทเนอร์' : 'Partner with us'}
              </Link>
            ) : null}
          </div>
          <button
            type="button"
            onClick={clearSelection}
            className="shrink-0 -mt-0.5 -mr-1 w-9 h-9 rounded-lg text-stone-400 hover:text-[#1A3C34] hover:bg-stone-50 transition-colors text-xl leading-none"
            aria-label={isTh ? 'ล้างการเลือก' : 'Clear selection'}
          >
            ×
          </button>
        </div>
      </div>
    ) : null;

  return (
    <section
      className="guide-section"
      aria-label={title || (isTh ? 'แผนที่ความครอบคลุมทั่วไทย' : 'Thailand coverage map')}
      {...(title ? { 'aria-labelledby': 'thailand-coverage-map-title' } : {})}
    >
      {title ? (
        <h2 id="thailand-coverage-map-title" className="popular-title text-center">
          {title}
        </h2>
      ) : null}
      {intro ? (
        <p className="text-stone-500 text-sm sm:text-base leading-relaxed max-w-2xl mx-auto text-center mb-6">
          {intro}
        </p>
      ) : null}

      <div className="max-w-5xl mx-auto flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(260px,320px)] lg:items-start lg:gap-6">
        <div className="order-1 min-w-0">
          <ThailandProvinceMap
            mode="public"
            provinces={provinces}
            lang={lang}
            selectedCode={selectedCode}
            onSelectProvince={(code) => setSelectedCode(code || null)}
            selectedAmphoeId={selectedAmphoeId}
            onSelectAmphoe={setSelectedAmphoeId}
          />
        </div>

        <div className="order-2 rounded-2xl border border-stone-200/80 bg-[#FDFCF8] p-3 sm:p-4">
          {serviceSummary}
          {showingAmphoes ? (
            <>
              <div className="flex items-center gap-2 mb-2">
                <button
                  type="button"
                  onClick={clearSelection}
                  className="text-xs font-semibold text-[#C5A059] hover:text-[#1A3C34] transition-colors shrink-0"
                >
                  {isTh ? '← จังหวัดทั้งหมด' : '← All provinces'}
                </button>
                <span className="text-xs text-stone-400 truncate">
                  {isTh
                    ? selectedProvince?.province_name_th ?? 'เชียงใหม่'
                    : selectedProvince?.province_name_en ?? 'Chiang Mai'}
                </span>
              </div>
              <label className="sr-only" htmlFor="amphoe-coverage-search">
                {isTh ? 'ค้นหาอำเภอ' : 'Search districts'}
              </label>
              <input
                id="amphoe-coverage-search"
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={isTh ? 'ค้นหาอำเภอ...' : 'Search district...'}
                className="w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-sm text-[#1A3C34] placeholder:text-stone-400 outline-none focus:border-[#C5A059] focus:ring-1 focus:ring-[#C5A059]"
                autoComplete="off"
              />
              <ul
                ref={amphoeListRef}
                className="mt-3 max-h-[min(42vh,320px)] lg:max-h-[min(58vh,480px)] overflow-y-auto overscroll-contain list-none m-0 p-0 divide-y divide-stone-100"
                role="listbox"
                aria-label={isTh ? 'รายการอำเภอ' : 'District list'}
              >
                {filteredAmphoes.length === 0 ? (
                  <li className="px-2 py-4 text-sm text-stone-500 text-center">
                    {isTh ? 'ไม่พบอำเภอ' : 'No districts match'}
                  </li>
                ) : (
                  filteredAmphoes.map(({ amphoe, feeLabel, subAreas }) => {
                    const active = amphoe.id === selectedAmphoeId;
                    return (
                      <li
                        key={amphoe.id}
                        data-amphoe-id={amphoe.id}
                        role="option"
                        aria-selected={active}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedAmphoeId(active ? null : amphoe.id)
                          }
                          className={`w-full flex items-center gap-2.5 px-2.5 py-2.5 text-left rounded-lg transition-colors ${
                            active
                              ? 'bg-[rgba(26,60,52,0.08)]'
                              : 'hover:bg-stone-50'
                          }`}
                        >
                          <span
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0 border border-white/80"
                            style={{ background: amphoeMapFill(amphoe, amphoeDestinationId) }}
                            aria-hidden
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-medium text-[#1A3C34] truncate">
                              {isTh ? amphoe.labelTh : amphoe.labelEn}
                            </span>
                            <span className="block text-xs text-stone-500 truncate">
                              {feeLabel}
                            </span>
                          </span>
                        </button>
                        {subAreas.length > 0 ? (
                          <ul className="list-none m-0 mt-0.5 mb-1.5 pl-6 pr-1 space-y-0.5">
                            {subAreas.map((area) => (
                              <li
                                key={area.zoneId}
                                className="flex items-baseline justify-between gap-2 px-2 py-1 text-xs text-stone-600"
                              >
                                <span className="min-w-0 leading-snug">
                                  {isTh ? area.labelTh : area.labelEn}
                                </span>
                                <span className="shrink-0 font-medium text-[#1A3C34]">
                                  {area.feeThb != null
                                    ? formatFeeRange(area.feeThb, area.feeThb, isTh ? 'th' : 'en')
                                    : isTh
                                      ? 'ยืนยันกับคนขับ'
                                      : 'Driver confirm'}
                                </span>
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </li>
                    );
                  })
                )}
              </ul>
            </>
          ) : (
            <>
              <label className="sr-only" htmlFor="province-coverage-search">
                {isTh ? 'ค้นหาจังหวัด' : 'Search provinces'}
              </label>
              <input
                id="province-coverage-search"
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={isTh ? 'ค้นหาจังหวัด...' : 'Search province...'}
                className="w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-sm text-[#1A3C34] placeholder:text-stone-400 outline-none focus:border-[#C5A059] focus:ring-1 focus:ring-[#C5A059]"
                autoComplete="off"
              />
              <ul
                className="mt-3 max-h-[min(42vh,320px)] lg:max-h-[min(58vh,480px)] overflow-y-auto overscroll-contain list-none m-0 p-0 divide-y divide-stone-100"
                role="listbox"
                aria-label={isTh ? 'รายการจังหวัด' : 'Province list'}
              >
                {filteredProvinces.length === 0 ? (
                  <li className="px-2 py-4 text-sm text-stone-500 text-center">
                    {isTh ? 'ไม่พบจังหวัด' : 'No provinces match'}
                  </li>
                ) : (
                  filteredProvinces.map((p) => {
                    const active = p.province_code === selectedCode;
                    const shoppable = canEnterCatalog(p);
                    return (
                      <li key={p.province_code} role="option" aria-selected={active}>
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedCode(active ? null : p.province_code)
                          }
                          className={`w-full flex items-center gap-2.5 px-2.5 py-2.5 text-left rounded-lg transition-colors ${
                            active
                              ? 'bg-[rgba(26,60,52,0.08)]'
                              : 'hover:bg-stone-50'
                          }`}
                        >
                          <span
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ background: getProvinceStatusFillColor(p.status) }}
                            aria-hidden
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-medium text-[#1A3C34] truncate">
                              {isTh ? p.province_name_th : p.province_name_en}
                            </span>
                            <span className="block text-xs text-stone-500 truncate">
                              {getProvinceStatusLabel(p.status)}
                              {shoppable
                                ? isTh
                                  ? ' · สั่งได้'
                                  : ' · Orderable'
                                : ''}
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })
                )}
              </ul>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
