import { readFile } from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';

export const dynamic = 'force-static';
export const revalidate = 86400;

/**
 * Serves Pai checkout-area TopoJSON for Mae Hong Son (pro_code 58).
 * Seven clickable Pai tambons — not the rest of the province.
 * Derived from https://github.com/chingchai/OpenGISData-Thailand — not the full national file.
 */
export async function GET() {
  try {
    const filePath = path.join(
      process.cwd(),
      'content/thailand-map/mae-hong-son-amphoes.topojson'
    );
    const buf = await readFile(filePath);
    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, max-age=86400, immutable',
      },
    });
  } catch (err) {
    console.error('[api/maps/mae-hong-son-amphoes] failed to read topojson:', err);
    return NextResponse.json({ error: 'Map data unavailable' }, { status: 500 });
  }
}
