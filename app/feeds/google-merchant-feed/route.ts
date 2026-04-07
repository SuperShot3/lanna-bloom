import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const FEED_PATH = join(process.cwd(), 'content', 'merchant', 'google-merchant-feed.tsv');

export async function GET() {
  try {
    const body = await readFile(FEED_PATH, 'utf8');
    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': 'text/tab-separated-values; charset=utf-8',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch {
    return new Response('Feed file not found', { status: 404 });
  }
}
