import { readFile } from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';

export const dynamic = 'force-static';
export const revalidate = 86400;

/** Serves the Thailand provinces TopoJSON without duplicating it under public/. */
export async function GET() {
  try {
    const filePath = path.join(
      process.cwd(),
      'content/thailand-map/thailand-provinces.topojson'
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
    console.error('[api/maps/thailand-provinces] failed to read topojson:', err);
    return NextResponse.json({ error: 'Map data unavailable' }, { status: 500 });
  }
}
