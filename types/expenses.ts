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

/** One row in the bill checklist (usually shop transfer + vendor bill; delivery is payment-only). */
export interface ExpenseBillLine {
  line_id: string;
  label: string;
  /**
   * When `false`, only `transfer_to_shop` counts (e.g. delivery paid to driver — no shop vendor bill).
   * When `true` or omitted, both transfer and vendor bill are required. Default true.
   */
  vendor_bill_applicable?: boolean;
  /** We have documentation for money transferred / paid (shop or driver). */
  transfer_to_shop: boolean;
  /** We have the vendor bill from the shop (ignored when `vendor_bill_applicable === false`). */
  bill_from_shop: boolean;
}

/** Server-only template before merging with stored checkbox state. */
export interface ExpenseBillLineTemplate {
  line_id: string;
  label: string;
  vendor_bill_applicable?: boolean;
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

/** Number of checklist boxes for one line (1 = driver payment only, 2 = shop transfer + vendor bill). */
export function billLineCheckpointCount(line: ExpenseBillLine): number {
  return line.vendor_bill_applicable === false ? 1 : 2;
}

/** Progress for list UI. Safe for client components. */
export function billTrackingProgress(
  lines: ExpenseBillLine[] | null | undefined
): { done: number; total: number } | null {
  if (!lines || lines.length === 0) return null;
  let total = 0;
  let done = 0;
  for (const l of lines) {
    const n = billLineCheckpointCount(l);
    total += n;
    if (n === 1) {
      if (l.transfer_to_shop) done += 1;
    } else {
      done += (l.transfer_to_shop ? 1 : 0) + (l.bill_from_shop ? 1 : 0);
    }
  }
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
    const vendorBillApplicable =
      o.line_id === 'order:delivery' ? false : o.vendor_bill_applicable !== false;
    lines.push({
      line_id: o.line_id,
      label: typeof o.label === 'string' && o.label ? o.label : o.line_id,
      vendor_bill_applicable: vendorBillApplicable,
      transfer_to_shop: o.transfer_to_shop === true,
      bill_from_shop: vendorBillApplicable ? o.bill_from_shop === true : false,
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
