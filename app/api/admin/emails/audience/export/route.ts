import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/adminRbac';
import { loadMarketingAudience } from '@/lib/email/loadMarketingAudience';
import { marketingSourceLabel } from '@/lib/email/marketingAudience';

function escapeCsv(value: string | null | undefined): string {
  if (value == null || value === '') return '';
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET() {
  const auth = await requireRole(['OWNER', 'MANAGER', 'SUPPORT']);
  if (!auth.ok) return auth.response;
  const result = await loadMarketingAudience();
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  const headers = [
    'email',
    'customer_name',
    'checkout_consent',
    'newsletter',
    'source',
    'newsletter_source',
    'last_order_id',
    'last_order_at',
  ];
  const rows = result.items.map((row) =>
    [
      escapeCsv(row.email),
      escapeCsv(row.customerName),
      row.checkoutConsent ? 'yes' : 'no',
      row.newsletter ? 'yes' : 'no',
      escapeCsv(marketingSourceLabel(row)),
      escapeCsv(row.newsletterSource),
      escapeCsv(row.lastOrderId),
      escapeCsv(row.lastOrderAt),
    ].join(',')
  );
  const csv = `\uFEFF${[headers.join(','), ...rows].join('\n')}\n`;
  const filename = `marketing-emails-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
