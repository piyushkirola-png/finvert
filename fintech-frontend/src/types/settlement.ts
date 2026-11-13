export interface Settlement {
  id: number;
  merchantId: number;
  amount: number;
  status: string;
  approvalStatus?: string;
  requestedAt: string;
  createdAt: string;
  completedAt?: string;
  processedAt?: string;
  notes?: string;
  sourceWalletBalanceBefore?: number;
  sourceWalletBalanceAfter?: number;
  destinationWalletBalanceBefore?: number;
  destinationWalletBalanceAfter?: number;
  merchant?: { name: string; email: string; businessName?: string };
}

export interface CreateSettlementPayload {
  merchantId: number;
  userId: number;
  amount: number;
  type: string;
  notes?: string;
}

export interface SettlementFilters {
  page?: number;
  limit?: number;
  status?: string;
}
