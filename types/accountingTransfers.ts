export type MoneyLocation = 'bank' | 'cash' | 'stripe' | 'other';
export type AccountingTransferStatus = 'pending' | 'received' | 'reconciled';

export interface AccountingTransfer {
  id: string;
  amount: number;
  currency: string;
  transfer_date: string; // YYYY-MM-DD
  from_location: MoneyLocation;
  to_location: MoneyLocation;
  status: AccountingTransferStatus;
  external_reference: string | null;
  bank_received_date: string | null;
  attachment_file_path: string | null;
  attachment_attached: boolean;
  note: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

