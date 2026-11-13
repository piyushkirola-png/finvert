export interface Refund {
  id: number;
  merchantId: number;
  amount: number;
  currency: string;
  refundType: string;
  status: "COMPLETED" | "PROCESSING" | "PENDING" | "FAILED" | "CANCELLED";
  reason: string;
  gatewayRefundId?: string;
  refundFee?: number;
  adjustmentAmount?: number;
  initiatedAt: string;
  completedAt?: string;
  updatedAt: string;
  createdAt: string;
  payInRequestId: number;
  merchant?: { name: string; email: string };
  gateway?: { name: string };
  payInRequest?: { id: number; merchantReference: string };
}

export interface RefundFilters {
  status: string;
  merchantId: string;
  merchantReference: string;
  payInRequestId: string;
  refundType: string;
  amountMin: string;
  amountMax: string;
  dateFrom: Date | null;
  dateTo: Date | null;
}

export interface RefundStats {
  completed: number;
  processing: number;
  pending: number;
  failed: number;
  cancelled: number;
  totalAmount: number;
}

export interface RefundApiFilters {
  offset?: number;
  limit?: number;
  status?: string;
  merchantId?: string;
  merchantReference?: string;
  payInRequestId?: string;
  refundType?: string;
  amountMin?: string;
  amountMax?: string;
  startDate?: string;
  endDate?: string;
  sorts?: string;
}

export interface CreateRefundPayload {
  payInRequestId: number;
  amount: number;
  reason: string;
  notes?: string;
}
