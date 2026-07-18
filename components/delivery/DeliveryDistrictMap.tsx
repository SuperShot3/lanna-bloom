'use client';

import { useCallback, useId, useMemo, useState } from 'react';
import Link from 'next/link';
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
  PROVINCE_OUTLINE_D,
  type AmphoeMapId,
} from '@/lib/delivery/amphoeMapData';
import { getDeliveryDistanceTiers } from '@/lib/delivery/distanceTiers';
import styles from './delivery-district-map.module.css';

type SelectionId = AmphoeMapId | 'other' | '';

interface DeliveryDistrictMapProps {
  lang: Locale;
}

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

export function DeliveryDistrictMap({ lang }: DeliveryDistrictMapProps) {
  const locale = mapLang(lang);
  const t = COPY[locale];
  const selectId = useId();
  const filterId = useId().replace(/:/g, '');
  const [selected, setSelected] = useState<SelectionId>('');
  const [hovered, setHovered] = useState<AmphoeMapId | null>(null);

  const distanceTiers = useMemo(() => getDeliveryDistanceTiers(), []);

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

  const shadowFilter = `mapShadow-${filterId}`;
  const glowFilter = `mapGlow-${filterId}`;
  const softLightId = `mapLight-${filterId}`;

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
            {AMPHOE_MAP_DISTRICTS.map((d) => (
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
            <svg
              viewBox="0 0 600 900"
              className={styles.svg}
              role="img"
              aria-label={
                lang === 'th'
                  ? 'แผนที่อำเภอเชียงใหม่แบบย่อสำหรับเลือกพื้นที่จัดส่ง'
                  : 'Simplified interactive Chiang Mai district map'
              }
            >
              <defs>
                <filter id={shadowFilter} x="-12%" y="-8%" width="124%" height="120%">
                  <feDropShadow dx="0" dy="14" stdDeviation="18" floodColor="#1a3c34" floodOpacity="0.16" />
                  <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#1a3c34" floodOpacity="0.08" />
                </filter>
                <filter id={glowFilter} x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="6" result="blur" />
                  <feColorMatrix
                    in="blur"
                    type="matrix"
                    values="0 0 0 0 0.77
                            0 0 0 0 0.63
                            0 0 0 0 0.35
                            0 0 0 0.55 0"
                    result="gold"
                  />
                  <feMerge>
                    <feMergeNode in="gold" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <radialGradient id={softLightId} cx="42%" cy="38%" r="68%">
                  <stop offset="0%" stopColor="#fffef9" stopOpacity="0.55" />
                  <stop offset="55%" stopColor="#f4efe6" stopOpacity="0.18" />
                  <stop offset="100%" stopColor="#e8e0d4" stopOpacity="0" />
                </radialGradient>
                <linearGradient id={`${filterId}-plate`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#f7f3ec" />
                  <stop offset="50%" stopColor="#f0ebe3" />
                  <stop offset="100%" stopColor="#e8e2d8" />
                </linearGradient>
              </defs>

              {/* Soft map plate */}
              <ellipse
                className={styles.mapPlate}
                cx="310"
                cy="460"
                rx="265"
                ry="390"
                fill={`url(#${filterId}-plate)`}
                filter={`url(#${shadowFilter})`}
              />
              <ellipse
                cx="310"
                cy="460"
                rx="265"
                ry="390"
                fill={`url(#${softLightId})`}
                pointerEvents="none"
              />

              <g className={styles.mapBody}>
                {AMPHOE_MAP_DISTRICTS.map((d) => {
                  const isActive = selected === d.id;
                  const isHover = hovered === d.id && !isActive;
                  return (
                    <g key={d.id}>
                      <path
                        id={d.id}
                        className={[
                          styles.district,
                          isActive ? styles.districtActive : '',
                          isHover ? styles.districtHover : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                        fill={amphoeMapFill(d)}
                        d={d.pathD}
                        filter={isActive ? `url(#${glowFilter})` : undefined}
                        onClick={() => activate(d.id)}
                        onMouseEnter={() => setHovered(d.id)}
                        onMouseLeave={() => setHovered(null)}
                        onFocus={() => setHovered(d.id)}
                        onBlur={() => setHovered(null)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            activate(d.id);
                          }
                        }}
                        tabIndex={0}
                        role="button"
                        aria-label={lang === 'th' ? d.labelTh : d.labelEn}
                        aria-pressed={isActive}
                      />
                      <text
                        className={`${styles.districtLabel} ${isActive ? styles.districtLabelActive : ''}`}
                        x={d.labelX}
                        y={d.labelY}
                        pointerEvents="none"
                      >
                        {(lang === 'th' ? d.labelLinesTh : d.labelLinesEn)?.length ? (
                          (lang === 'th' ? d.labelLinesTh! : d.labelLinesEn!).map((line, i) => (
                            <tspan key={line} x={d.labelX} dy={i === 0 ? 0 : d.labelLine2Dy ?? 14}>
                              {line}
                            </tspan>
                          ))
                        ) : (
                          lang === 'th' ? d.labelTh : d.labelEn
                        )}
                      </text>
                    </g>
                  );
                })}
                <path className={styles.provinceOutline} d={PROVINCE_OUTLINE_D} />
                <path className={styles.provinceRim} d={PROVINCE_OUTLINE_D} />
              </g>
            </svg>

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
                    {tier.feeThb != null
                      ? `฿${tier.feeThb.toLocaleString()}`
                      : t.manualFee}
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
