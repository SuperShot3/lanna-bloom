/**
 * Validate that a province is wired for the claimed launch tier.
 *
 * Usage:
 *   npx tsx scripts/validate-province-launch.ts <province_code> [--amphoe]
 *   npm run validate:province -- chiang-mai
 *   npm run validate:province -- chiang-mai --amphoe
 */

import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { PROVINCE_SEED_ROSTER } from '../lib/provinces/seedRoster';
import {
  DELIVERY_DESTINATIONS,
  MARKETS,
  type DeliveryDestinationId,
} from '../lib/delivery/markets';
import { ZONES_BY_DESTINATION } from '../lib/delivery/zones';
import { AMPHOE_MAP_DISTRICTS } from '../lib/delivery/amphoeMapData';
import { LAMPHUN_AMPHOE_MAP_DISTRICTS } from '../lib/delivery/lamphunAmphoeMapData';
import { CHON_BURI_AMPHOE_MAP_DISTRICTS } from '../lib/delivery/chonBuriAmphoeMapData';
import { PHUKET_AMPHOE_MAP_DISTRICTS } from '../lib/delivery/phuketAmphoeMapData';
import { PRACHUAP_KHIRI_KHAN_AMPHOE_MAP_DISTRICTS } from '../lib/delivery/prachuapKhiriKhanAmphoeMapData';
import { KRABI_AMPHOE_MAP_DISTRICTS } from '../lib/delivery/krabiAmphoeMapData';
import { SURAT_THANI_AMPHOE_MAP_DISTRICTS } from '../lib/delivery/suratThaniAmphoeMapData';
import { isAmphoeCapableProvince } from '../lib/delivery/amphoeProvinces';

type Check = { ok: boolean; label: string; detail?: string };

function fail(label: string, detail?: string): Check {
  return { ok: false, label, detail };
}
function pass(label: string, detail?: string): Check {
  return { ok: true, label, detail };
}

function main() {
  const args = process.argv.slice(2).filter((a) => a !== '--');
  const wantAmphoe = args.includes('--amphoe');
  const code = args.find((a) => !a.startsWith('--'));

  if (!code) {
    console.error(
      'Usage: npx tsx scripts/validate-province-launch.ts <province_code> [--amphoe]'
    );
    process.exit(2);
  }

  const checks: Check[] = [];
  const row = PROVINCE_SEED_ROSTER.find((r) => r.province_code === code);

  if (!row) {
    checks.push(fail('seed roster', `No PROVINCE_SEED_ROSTER row for "${code}"`));
    printReport(code, wantAmphoe, checks);
    process.exit(1);
  }

  checks.push(pass('seed roster', `${row.province_name_en} / ${row.province_name_th}`));

  if (row.topojson_property_value?.trim()) {
    checks.push(pass('topojson_property_value', row.topojson_property_value));
  } else {
    checks.push(fail('topojson_property_value', 'Empty — map join will fail'));
  }

  const dest = row.destination_id;

  if (!dest) {
    checks.push(
      pass(
        'tier A (status-only)',
        'No destination_id — configure status/catalog in /admin/provinces only'
      )
    );
    if (wantAmphoe) {
      checks.push(
        fail('--amphoe', 'Amphoe drill-down requires Tier B destination + zones first')
      );
    }
    printReport(code, wantAmphoe, checks);
    process.exit(checks.every((c) => c.ok) ? 0 : 1);
  }

  const destOk = (DELIVERY_DESTINATIONS as readonly string[]).includes(dest);
  checks.push(
    destOk
      ? pass('DELIVERY_DESTINATIONS', dest)
      : fail('DELIVERY_DESTINATIONS', `"${dest}" missing from markets.ts`)
  );

  const zones =
    destOk && dest in ZONES_BY_DESTINATION
      ? ZONES_BY_DESTINATION[dest as DeliveryDestinationId]
      : [];
  if (zones.length > 0) {
    checks.push(pass('zones', `${zones.length} zone(s) in ZONES_BY_DESTINATION`));
  } else {
    checks.push(fail('zones', `No zones for destination "${dest}" in zones.ts`));
  }

  const market = MARKETS.find((m) => m.destinationId === dest);
  if (dest === 'CHIANG_MAI') {
    checks.push(
      pass('MARKETS', 'CHIANG_MAI uses main catalog (no market path slug required)')
    );
  } else if (market) {
    checks.push(
      pass(
        'MARKETS',
        `${market.pathSlug} status=${market.status} (Header/Footer/sitemap)`
      )
    );
  } else {
    checks.push(
      fail(
        'MARKETS',
        `No MARKETS entry for destination "${dest}" — Header/Footer will omit it`
      )
    );
  }

  // Amphoe (Tier C): always verify CM assets; other provinces only with --amphoe
  if (wantAmphoe || code === 'chiang-mai') {
    const amphoeRequired = wantAmphoe || code === 'chiang-mai';
    checks.push(...validateAmphoe(code, amphoeRequired));
  }

  if (wantAmphoe && code !== 'chiang-mai') {
    if (isAmphoeCapableProvince(code)) {
      checks.push(
        pass(
          'amphoe generalization',
          `${code} registered in amphoeProvinces + shared ThailandProvinceMap / CoverageMapSection`
        )
      );
      checks.push(...validateSharedMapGates());
    } else {
      checks.push(
        fail(
          'amphoe generalization',
          'Register province in amphoeProvinces.ts and wire map fetch before claiming Tier C'
        )
      );
    }
  }

  printReport(code, wantAmphoe, checks);
  process.exit(checks.every((c) => c.ok) ? 0 : 1);
}

function validateSharedMapGates(): Check[] {
  const out: Check[] = [];
  const mapPath = path.join(
    process.cwd(),
    'components/delivery/ThailandProvinceMap.tsx'
  );
  const coveragePath = path.join(
    process.cwd(),
    'components/delivery/ThailandCoverageMapSection.tsx'
  );
  const mapSrc = readFileSync(mapPath, 'utf8');
  const coverageSrc = readFileSync(coveragePath, 'utf8');

  if (mapSrc.includes('isAmphoeCapableProvince') && mapSrc.includes('amphoeMapApiPath')) {
    out.push(pass('ThailandProvinceMap amphoe gates', 'multi-province capable'));
  } else {
    out.push(
      fail(
        'ThailandProvinceMap amphoe gates',
        'Expected isAmphoeCapableProvince + amphoeMapApiPath'
      )
    );
  }

  if (
    coverageSrc.includes('isAmphoeCapableProvince') &&
    coverageSrc.includes('getAmphoeDrillItems')
  ) {
    out.push(pass('ThailandCoverageMapSection amphoe gates', 'multi-province capable'));
  } else {
    out.push(
      fail(
        'ThailandCoverageMapSection amphoe gates',
        'Expected isAmphoeCapableProvince + getAmphoeDrillItems'
      )
    );
  }

  return out;
}

function validateAmphoe(provinceCode: string, required: boolean): Check[] {
  const out: Check[] = [];
  const topoRel = `content/thailand-map/${provinceCode}-amphoes.topojson`;
  const topoAbs = path.join(process.cwd(), topoRel);
  const apiRel = `app/api/maps/${provinceCode}-amphoes/route.ts`;
  const apiAbs = path.join(process.cwd(), apiRel);

  if (existsSync(topoAbs)) {
    out.push(pass('amphoe TopoJSON', topoRel));
  } else {
    out.push(
      required
        ? fail('amphoe TopoJSON', `Missing ${topoRel}`)
        : pass('amphoe TopoJSON', `optional — ${topoRel} not present`)
    );
  }

  if (existsSync(apiAbs)) {
    out.push(pass('amphoe API route', apiRel));
  } else {
    out.push(
      required
        ? fail('amphoe API route', `Missing ${apiRel}`)
        : pass('amphoe API route', `optional — ${apiRel} not present`)
    );
  }

  if (provinceCode === 'chiang-mai') {
    const withCodes = AMPHOE_MAP_DISTRICTS.filter((d) => d.id !== 'other' && d.ampCode);
    const codes = withCodes.map((d) => d.ampCode);
    const unique = new Set(codes);
    if (withCodes.length >= 20 && unique.size === codes.length) {
      out.push(
        pass('amphoe metadata', `${withCodes.length} districts, unique ampCode`)
      );
    } else {
      out.push(
        fail(
          'amphoe metadata',
          `Expected ~25 unique ampCodes in amphoeMapData; got ${withCodes.length} / unique ${unique.size}`
        )
      );
    }
  } else if (provinceCode === 'lamphun') {
    const codes = LAMPHUN_AMPHOE_MAP_DISTRICTS.map((d) => d.ampCode);
    const unique = new Set(codes);
    if (LAMPHUN_AMPHOE_MAP_DISTRICTS.length === 8 && unique.size === 8) {
      out.push(pass('amphoe metadata', '8 Lamphun districts, unique ampCode'));
    } else {
      out.push(
        fail(
          'amphoe metadata',
          `Expected 8 unique ampCodes in lamphunAmphoeMapData; got ${LAMPHUN_AMPHOE_MAP_DISTRICTS.length} / unique ${unique.size}`
        )
      );
    }
  } else if (provinceCode === 'chon-buri') {
    const codes = CHON_BURI_AMPHOE_MAP_DISTRICTS.map((d) => d.ampCode);
    const unique = new Set(codes);
    if (CHON_BURI_AMPHOE_MAP_DISTRICTS.length === 7 && unique.size === 7) {
      out.push(pass('amphoe metadata', '7 Pattaya areas, unique ampCode'));
    } else {
      out.push(
        fail(
          'amphoe metadata',
          `Expected 7 unique ampCodes in chonBuriAmphoeMapData; got ${CHON_BURI_AMPHOE_MAP_DISTRICTS.length} / unique ${unique.size}`
        )
      );
    }
  } else if (provinceCode === 'phuket') {
    const codes = PHUKET_AMPHOE_MAP_DISTRICTS.map((d) => d.ampCode);
    const unique = new Set(codes);
    if (PHUKET_AMPHOE_MAP_DISTRICTS.length === 11 && unique.size === 11) {
      out.push(pass('amphoe metadata', '11 Phuket areas, unique ampCode'));
    } else {
      out.push(
        fail(
          'amphoe metadata',
          `Expected 11 unique ampCodes in phuketAmphoeMapData; got ${PHUKET_AMPHOE_MAP_DISTRICTS.length} / unique ${unique.size}`
        )
      );
    }
  } else if (provinceCode === 'prachuap-khiri-khan') {
    const codes = PRACHUAP_KHIRI_KHAN_AMPHOE_MAP_DISTRICTS.map((d) => d.ampCode);
    const unique = new Set(codes);
    if (PRACHUAP_KHIRI_KHAN_AMPHOE_MAP_DISTRICTS.length === 6 && unique.size === 6) {
      out.push(pass('amphoe metadata', '6 Hua Hin areas, unique ampCode'));
    } else {
      out.push(
        fail(
          'amphoe metadata',
          `Expected 6 unique ampCodes in prachuapKhiriKhanAmphoeMapData; got ${PRACHUAP_KHIRI_KHAN_AMPHOE_MAP_DISTRICTS.length} / unique ${unique.size}`
        )
      );
    }
  } else if (provinceCode === 'krabi') {
    const codes = KRABI_AMPHOE_MAP_DISTRICTS.map((d) => d.ampCode);
    const unique = new Set(codes);
    if (KRABI_AMPHOE_MAP_DISTRICTS.length === 5 && unique.size === 5) {
      out.push(pass('amphoe metadata', '5 Krabi / Ao Nang areas, unique ampCode'));
    } else {
      out.push(
        fail(
          'amphoe metadata',
          `Expected 5 unique ampCodes in krabiAmphoeMapData; got ${KRABI_AMPHOE_MAP_DISTRICTS.length} / unique ${unique.size}`
        )
      );
    }
  } else if (provinceCode === 'surat-thani') {
    const codes = SURAT_THANI_AMPHOE_MAP_DISTRICTS.map((d) => d.ampCode);
    const unique = new Set(codes);
    if (SURAT_THANI_AMPHOE_MAP_DISTRICTS.length === 8 && unique.size === 8) {
      out.push(pass('amphoe metadata', '8 Koh Samui areas, unique ampCode'));
    } else {
      out.push(
        fail(
          'amphoe metadata',
          `Expected 8 unique ampCodes in suratThaniAmphoeMapData; got ${SURAT_THANI_AMPHOE_MAP_DISTRICTS.length} / unique ${unique.size}`
        )
      );
    }
  } else if (required) {
    out.push(
      fail(
        'amphoe metadata',
        'Add province-specific amphoe metadata (mirror amphoeMapData.ts) before --amphoe'
      )
    );
  }

  return out;
}

function printReport(code: string, wantAmphoe: boolean, checks: Check[]) {
  const failed = checks.filter((c) => !c.ok);
  console.log(`\nProvince launch check: ${code}${wantAmphoe ? ' (--amphoe)' : ''}\n`);
  for (const c of checks) {
    const mark = c.ok ? 'PASS' : 'FAIL';
    console.log(`  [${mark}] ${c.label}${c.detail ? ` — ${c.detail}` : ''}`);
  }
  console.log(
    failed.length === 0
      ? `\nOK — ${checks.length} check(s) passed.\n`
      : `\nFAILED — ${failed.length} of ${checks.length} check(s).\n`
  );
}

main();
