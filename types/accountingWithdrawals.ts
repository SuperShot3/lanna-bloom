import type { MoneyLocation } from '@/types/accountingTransfers';

export type AccountingWithdrawalStatus = 'pending' | 'confirmed';

export interface AccountingWithdrawal {
  id: string;
  amount: number;
  currency: string;
  withdrawal_date: string;
  from_location: MoneyLocation;
  purpose: string;
  notes: string | null;
  status: AccountingWithdrawalStatus;
  proof_file_path: string | null;
  proof_attached: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export const WITHDRAWAL_STATUSES: { value: AccountingWithdrawalStatus; label: string }[] = [
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'pending', label: 'Pending' },
];
