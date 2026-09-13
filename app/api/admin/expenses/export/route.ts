import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/adminRbac';
import { getAllExpensesForExport } from '@/lib/expenses/expenseQueries';
import { listExpenseCategories } from '@/lib/expenses/expenseCategoryQueries';
import {
  billTrackingProgress,
  expenseDocumentationComplete,
  PAYMENT_METHOD_LABEL_BY_VALUE,
  type DocumentationFilter,
} from '@/types/expenses';

export const dynamic = 'force-dynamic';

function escapeCsv(value: string | number | null | undefined): string {
  if (value == null) return '';
  const s = String(value);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function GET(request: NextRequest) {
  const authResult = await requireRole(['OWNER', 'MANAGER']);
  if (!authResult.ok) return authResult.response;

  const sp = request.nextUrl.searchParams;
  const receiptRaw = sp.get('receipt');
  const receipt: 'all' | 'missing' | 'attached' | undefined =
    receiptRaw === 'missing' || receiptRaw === 'attached' || receiptRaw === 'all' ? receiptRaw : undefined;
  const docRaw = sp.get('documentation');
  const documentation: DocumentationFilter | undefined =
    docRaw === 'incomplete' || docRaw === 'complete' ? docRaw : undefined;

  const filters = {
    dateFrom: sp.get('dateFrom') ?? undefined,
    dateTo: sp.get('dateTo') ?? undefined,
    category: sp.get('category') ?? undefined,
    payment_method: sp.get('payment_method') ?? undefined,
    receipt,
    documentation,
  };

  const [expenses, categoriesResult] = await Promise.all([
    getAllExpensesForExport(filters),
    listExpenseCategories(),
  ]);
  const categoryLabel = Object.fromEntries(
    (categoriesResult.ok ? categoriesResult.categories : []).map((c) => [c.value, c.label])
  );

  const headers = [
    'Date',
    'Description',
    'Category',
    'Payment method',
    'Receipt attached',
    'Proof checks (done/total)',
    'Documentation complete',
    'Incomplete',
    'Paper bill request sent',
    'Amount',
    'Currency',
    'Notes',
    'Linked order',
    'Created by',
  ];

  const rows = expenses.map((exp) => {
    const complete = expenseDocumentationComplete(exp);
    const progress = billTrackingProgress(exp.bill_tracking);
    return [
      escapeCsv(exp.date.slice(0, 10)),
      escapeCsv(exp.description),
      escapeCsv(categoryLabel[exp.category] ?? exp.category),
      escapeCsv(PAYMENT_METHOD_LABEL_BY_VALUE[exp.payment_method] ?? exp.payment_method),
      escapeCsv(exp.receipt_attached ? 'Yes' : 'MISSING'),
      escapeCsv(progress ? `${progress.done}/${progress.total}` : '—'),
      escapeCsv(complete ? 'Yes' : 'No'),
      escapeCsv(complete ? '' : 'YES'),
      escapeCsv(exp.paper_bill_requested_at ? 'Yes' : ''),
      escapeCsv(String(exp.amount)),
      escapeCsv(exp.currency || 'THB'),
      escapeCsv(exp.notes ?? ''),
      escapeCsv(exp.linked_order_id ?? ''),
      escapeCsv(exp.created_by ?? ''),
    ].join(',');
  });

  // Prepend a UTF-8 BOM so Excel renders Thai text / non-ASCII correctly.
  const csv = '﻿' + [headers.join(','), ...rows].join('\n');
  const filename = `expenses-export-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
