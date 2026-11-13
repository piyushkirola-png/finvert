export interface Chargeback {
  id: number;
  merchantId: number;
  merchant?: { id: number; name: string; email: string };
  gatewayId?: number;
  gateway?: { id: number; name: string };
  payInRequestId: number;
  amount: number;
  status: "APPROVED" | "REJECTED" | "DISPUTED" | "REVERSED";
  reason: string;
  reasonDescription?: string;
  notes?: string;
  initiatedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChargebackFilters {
  status: string;
  merchantId: string;
  gatewayName: string;
  payInRequestId: string;
  reason: string;
  amountMin: string;
  amountMax: string;
  dateFrom: Date | null;
  dateTo: Date | null;
}

export interface ChargebackStats {
  approved: number;
  rejected: number;
  disputed: number;
  reversed: number;
  totalAmount: number;
}

export interface ChargebackApiFilters {
  offset?: number;
  limit?: number;
  status?: string;
  merchantId?: string;
  gatewayId?: number;
  payInRequestId?: string;
  reason?: string;
  amountMin?: string;
  amountMax?: string;
  startDate?: string;
  endDate?: string;
  sorts?: string;
}
