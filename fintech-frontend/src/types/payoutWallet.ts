export interface PayoutWalletTransaction {
  id: number;
  transactionId: string;
  referenceId: string;
  userId: number;
  merchantId: number;
  type: "CREDIT" | "DEBIT";
  amount: number;
  openingBalance: number;
  closingBalance: number;
  description?: string;
  transactionDate: string;
  createdAt: string;
  updatedAt: string;
  merchant?: { id: number; name: string };
  user?: { id: number; fullName: string; email: string };
}

export interface PayoutWalletSummary {
  closingBalance: number;
  totalOutToday: number;
  totalChargesToday: number;
  lastRefreshedAt: string;
}

export interface PayoutWalletFilters {
  type: string;
  userId: string;
  merchantId: string;
  transactionId: string;
  referenceId: string;
  search: string;
  amountMin: string;
  amountMax: string;
  dateFrom: Date | null;
  dateTo: Date | null;
  offset?: number;
  limit?: number;
}

export interface PayoutWalletListResponse {
  data: PayoutWalletTransaction[];
  total: number;
  offset: number;
  limit: number;
}

export interface PayoutWalletStats {
  completed: number;
  failed: number;
  pending: number;
}

export interface ExportPayoutWalletFilters {
  type?: string;
  userId?: string;
  merchantId?: string;
  transactionId?: string;
  referenceId?: string;
  search?: string;
  amountMin?: string;
  amountMax?: string;
  startDate?: string;
  endDate?: string;
}

export interface FilterOption {
  id: number | string;
  name: string;
  email?: string;
  merchantName?: string;
  fullName?: string;
}
