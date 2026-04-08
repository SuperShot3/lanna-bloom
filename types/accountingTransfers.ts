export type MoneyLocation = 'bank' | 'cash' | 'stripe' | 'other';

export interface AccountingTransfer {
  id: string;
  amount: number;
  currency: string;
  transfer_date: string; // YYYY-MM-DD
  from_location: MoneyLocation;
  to_location: MoneyLocation;
  note: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

