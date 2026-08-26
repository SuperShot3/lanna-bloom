import { readFile } from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';

export const dynamic = 'force-static';
export const revalidate = 86400;

/**
 * Serves Krabi / Ao Nang checkout-area TopoJSON (pro_code 81).
 * Six clickable listed areas — not the rest of Krabi.
 * Derived from https://github.com/chingchai/OpenGISData-Thailand — not the full national file.
 */
export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'content/thailand-map/krabi-amphoes.topojson');
    const buf = await readFile(filePath);
    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, max-age=86400, immutable',
      },
    });
  } catch (err) {
    console.error('[api/maps/krabi-amphoes] failed to read topojson:', err);
    return NextResponse.json({ error: 'Map data unavailable' }, { status: 500 });
  }
}
