export type ExpenseCategory =
  | 'flowers'
  | 'packaging'
  | 'delivery'
  | 'advertising'
  | 'supplier_payment'
  | 'transport'
  | 'tools_equipment'
  | 'soft_toys'
  | 'greeting_cards'
  | 'other';

export type PaymentMethod =
  | 'cash'
  | 'bank_transfer'
  | 'card'
  | 'qr_payment'
  | 'other';

/** One row in the dual bill checklist (transfer to shop + bill from shop). */
export interface ExpenseBillLine {
  line_id: string;
  label: string;
  /** We have documentation for money transferred / paid to the shop (e.g. slip). */
  transfer_to_shop: boolean;
  /** We have the vendor bill from the shop. */
  bill_from_shop: boolean;
}

/** Server-only template before merging with stored checkbox state. */
export interface ExpenseBillLineTemplate {
  line_id: string;
  label: string;
}

export interface Expense {
  id: string;
  amount: number;
  currency: string;
  date: string;          // ISO date string YYYY-MM-DD
  category: ExpenseCategory;
  description: string;
  payment_method: PaymentMethod;
  receipt_file_path: string | null;
  receipt_attached: boolean;
  created_by: string;
  notes: string | null;
  linked_order_id: string | null;
  created_at: string;
  updated_at: string;
  /**
   * Checklist: per order line (or one default row), two booleans each.
   * Persisted as JSONB; empty until first resolve (detail page or create).
   */
  bill_tracking?: ExpenseBillLine[] | null;
}

export interface ExpenseReceiptImage {
  id: string;
  file_path: string;
  file_name: string;
  created_at: string;
  is_legacy: boolean;
}

export type ReceiptFilter = 'all' | 'missing' | 'attached';

/** Full documentation = receipt file + bill checklist (when checklist rows exist). */
export type DocumentationFilter = 'all' | 'incomplete' | 'complete';

export interface ExpenseFilters {
  dateFrom?: string;
  dateTo?: string;
  category?: string;
  payment_method?: string;
  /**
   * `missing`  → only rows with no receipt attached
   * `attached` → only rows with a receipt attached
   * `all` / undefined → no filter
   */
  receipt?: ReceiptFilter;
  /**
   * When set, expenses are filtered in memory after fetch (same date/category/payment scope).
   * Combines with `receipt` using AND.
   */
  documentation?: DocumentationFilter;
}

export const EXPENSE_CATEGORIES: { value: ExpenseCategory; label: string }[] = [
  { value: 'flowers',          label: 'Flowers' },
  { value: 'packaging',        label: 'Packaging' },
  { value: 'delivery',         label: 'Delivery' },
  { value: 'advertising',      label: 'Advertising' },
  { value: 'supplier_payment', label: 'Supplier Payment' },
  { value: 'transport',        label: 'Transport' },
  { value: 'tools_equipment',  label: 'Tools & Equipment' },
  { value: 'soft_toys',        label: 'Soft toys' },
  { value: 'greeting_cards',   label: 'Greeting cards' },
  { value: 'other',            label: 'Other' },
];

export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'cash',          label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank Account' },
];

/** Progress for list UI: done / total (2 checks per line). Safe for client components. */
export function billTrackingProgress(
  lines: ExpenseBillLine[] | null | undefined
): { done: number; total: number } | null {
  if (!lines || lines.length === 0) return null;
  const total = lines.length * 2;
  const done = lines.reduce(
    (s, l) => s + (l.transfer_to_shop ? 1 : 0) + (l.bill_from_shop ? 1 : 0),
    0
  );
  return { done, total };
}

/** Parse `expenses.bill_tracking` JSONB from the DB into typed lines (undefined if absent / invalid). */
export function parseExpenseBillTrackingJson(bt: unknown): ExpenseBillLine[] | undefined {
  if (bt == null) return undefined;
  if (!Array.isArray(bt)) return undefined;
  const lines: ExpenseBillLine[] = [];
  for (const x of bt) {
    if (!x || typeof x !== 'object') continue;
    const o = x as Record<string, unknown>;
    if (typeof o.line_id !== 'string' || !o.line_id) continue;
    lines.push({
      line_id: o.line_id,
      label: typeof o.label === 'string' && o.label ? o.label : o.line_id,
      transfer_to_shop: o.transfer_to_shop === true,
      bill_from_shop: o.bill_from_shop === true,
    });
  }
  return lines;
}

/**
 * True when the expense has a receipt image on file and every bill-checklist box is ticked
 * (when the checklist has rows; otherwise only the receipt file matters).
 */
export function expenseDocumentationComplete(
  e: Pick<Expense, 'receipt_attached'> & { bill_tracking?: ExpenseBillLine[] | null }
): boolean {
  if (!e.receipt_attached) return false;
  const p = billTrackingProgress(e.bill_tracking ?? []);
  if (p == null) return true;
  return p.done === p.total;
}
