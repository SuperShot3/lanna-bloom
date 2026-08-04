'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import type { Locale } from '@/lib/i18n';
import type { PublicProvince } from '@/lib/provinces/types';
import {
  getProvinceStatusFillColor,
  getProvinceStatusLabel,
} from '@/lib/provinces/statusColors';
import {
  filterProvincesBySearch,
  sortProvincesForCoverageList,
} from '@/lib/delivery/coverageDisplay';
import { canEnterCatalog } from '@/lib/provinces/shopAccess';

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
  title: string;
  intro: string;
}) {
  const [provinces, setProvinces] = useState(initialProvinces);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const isTh = lang === 'th';

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

  const sorted = useMemo(
    () => sortProvincesForCoverageList(provinces, lang),
    [provinces, lang]
  );

  const filtered = useMemo(
    () => filterProvincesBySearch(sorted, search),
    [sorted, search]
  );

  if (provinces.length === 0) return null;

  return (
    <section className="guide-section" aria-labelledby="thailand-coverage-map-title">
      <h2 id="thailand-coverage-map-title" className="popular-title text-center">
        {title}
      </h2>
      <p className="text-stone-500 text-sm sm:text-base leading-relaxed max-w-2xl mx-auto text-center mb-6">
        {intro}
      </p>

      <div className="max-w-5xl mx-auto flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(260px,320px)] lg:items-start lg:gap-6">
        {/* Mobile-first: searchable list primary; map remains available */}
        <div className="order-1 lg:order-2 rounded-2xl border border-stone-200/80 bg-[#FDFCF8] p-3 sm:p-4">
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
            {filtered.length === 0 ? (
              <li className="px-2 py-4 text-sm text-stone-500 text-center">
                {isTh ? 'ไม่พบจังหวัด' : 'No provinces match'}
              </li>
            ) : (
              filtered.map((p) => {
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
        </div>

        <div className="order-2 lg:order-1 min-w-0">
          <ThailandProvinceMap
            mode="public"
            provinces={provinces}
            lang={lang}
            selectedCode={selectedCode}
            onSelectProvince={(code) => setSelectedCode(code || null)}
          />
        </div>
      </div>
    </section>
  );
}
