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
  | 'balloons'
  | 'other';

export type PaymentMethod =
  | 'cash'
  | 'bank_transfer'
  | 'stripe'
  | 'card'
  | 'qr_payment'
  | 'other';

/** One row in the bill/proof checklist. Stored fields keep the original two-checkbox shape. */
export interface ExpenseBillLine {
  line_id: string;
  label: string;
  /**
   * Kept for historical data. The UI now tracks one proof check per row, whether this is a
   * shop purchase paper bill/payment proof or driver payment proof.
   */
  vendor_bill_applicable?: boolean;
  /** Single proof state used by the current UI. */
  transfer_to_shop: boolean;
  /** Historical second checkbox; treated as proof too when parsing older completed rows. */
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
  /** Checklist: per order line (or one default row), one proof check each. */
  bill_tracking?: ExpenseBillLine[] | null;
  /** Set when staff generates the vendor paper-bill request PDF. */
  paper_bill_requested_at?: string | null;
}

export interface ExpenseReceiptImage {
  id: string;
  file_path: string;
  file_name: string;
  created_at: string;
  is_legacy: boolean;
}

export type ReceiptFilter = 'all' | 'missing' | 'attached';

/** Full documentation = receipt image + proof checklist (when checklist rows exist). */
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
  { value: 'balloons',         label: 'Balloons' },
  { value: 'soft_toys',        label: 'Soft toys' },
  { value: 'greeting_cards',   label: 'Greeting cards' },
  { value: 'advertising',      label: 'Advertising' },
  { value: 'supplier_payment', label: 'Supplier Payment' },
  { value: 'transport',        label: 'Transport' },
  { value: 'tools_equipment',  label: 'Tools & Equipment' },
  { value: 'other',            label: 'Other' },
];

/**
 * P+L overview: included in gross profit via COGS (bouquet adds-on and direct sale materials).
 * Categories not listed here count as operating (e.g. advertising, transport, tools, Other for AI/Google).
 */
export const COGS_EXPENSE_CATEGORIES = new Set<string>([
  'flowers',
  'delivery',
  'packaging',
  'soft_toys',
  'greeting_cards',
  'balloons',
]);

/** Payment methods admins may choose for new/expense edits. (Stripe balance is not an operating-pay bucket here.) */
export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank Account' },
];

/** Display label for any `expenses.payment_method` value possibly in the DB. */
export const PAYMENT_METHOD_LABEL_BY_VALUE: Record<string, string> = {
  cash: 'Cash',
  bank_transfer: 'Bank Account',
  card: 'Card',
  qr_payment: 'QR payment',
  other: 'Other',
  stripe: 'Stripe balance (legacy)',
};

/** Filters on expense lists: includes legacy Stripe rows. */
export const EXPENSE_PAYMENT_FILTER_OPTIONS: { value: string; label: string }[] = [
  ...PAYMENT_METHODS.map((m) => ({ value: m.value, label: m.label })),
  { value: 'stripe', label: 'Stripe balance (legacy)' },
];

/** Number of checklist boxes for one line. All expense lines now use one proof check. */
export function billLineCheckpointCount(_line: ExpenseBillLine): number {
  return 1;
}

/** One received proof completes the row; `bill_from_shop` preserves old completed data. */
export function billLineProofReceived(line: ExpenseBillLine): boolean {
  return line.transfer_to_shop || line.bill_from_shop;
}

/** Set the single proof state while keeping legacy JSON fields internally consistent. */
export function setBillLineProofReceived(
  line: ExpenseBillLine,
  received: boolean
): ExpenseBillLine {
  return {
    ...line,
    transfer_to_shop: received,
    bill_from_shop: line.vendor_bill_applicable === false ? false : received,
  };
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
    if (billLineProofReceived(l)) done += 1;
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
 * True when the expense has a receipt image on file and every bill/proof checklist row is
 * complete (when checklist rows exist; otherwise only the receipt file matters).
 */
export function expenseDocumentationComplete(
  e: Pick<Expense, 'receipt_attached'> & { bill_tracking?: ExpenseBillLine[] | null }
): boolean {
  if (!e.receipt_attached) return false;
  const p = billTrackingProgress(e.bill_tracking ?? []);
  if (p == null) return true;
  return p.done === p.total;
}
