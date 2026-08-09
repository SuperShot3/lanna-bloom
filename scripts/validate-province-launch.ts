/**
 * Validate that a province is wired for the claimed launch tier.
 *
 * Usage:
 *   npx tsx scripts/validate-province-launch.ts <province_code> [--amphoe]
 *   npm run validate:province -- chiang-mai
 *   npm run validate:province -- chiang-mai --amphoe
 */

import { existsSync } from 'fs';
import path from 'path';
import { PROVINCE_SEED_ROSTER } from '../lib/provinces/seedRoster';
import {
  DELIVERY_DESTINATIONS,
  MARKETS,
  type DeliveryDestinationId,
} from '../lib/delivery/markets';
import { ZONES_BY_DESTINATION } from '../lib/delivery/zones';
import { AMPHOE_MAP_DISTRICTS } from '../lib/delivery/amphoeMapData';

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
    checks.push(
      fail(
        'amphoe generalization',
        'Map/coverage still hard-code chiang-mai — generalize ThailandProvinceMap + ThailandCoverageMapSection before claiming Tier C'
      )
    );
  }

  printReport(code, wantAmphoe, checks);
  process.exit(checks.every((c) => c.ok) ? 0 : 1);
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
