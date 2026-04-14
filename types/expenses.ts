export type ExpenseCategory =
  | 'flowers'
  | 'packaging'
  | 'delivery'
  | 'advertising'
  | 'supplier_payment'
  | 'transport'
  | 'tools_equipment'
  | 'soft_toys'
  | 'other';

export type PaymentMethod =
  | 'cash'
  | 'bank_transfer'
  | 'card'
  | 'qr_payment'
  | 'other';

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
}

export interface ExpenseReceiptImage {
  id: string;
  file_path: string;
  file_name: string;
  created_at: string;
  is_legacy: boolean;
}

export interface ExpenseFilters {
  dateFrom?: string;
  dateTo?: string;
  category?: string;
  payment_method?: string;
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
  { value: 'other',            label: 'Other' },
];

export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'cash',          label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank Account' },
];
