export interface PayInRequest {
  id: number;
  orderId: string;
  merchantReference?: string;
  userId: number;
  merchantId: number;
  gatewayId?: number;
  amount: number;
  amountInINR: number;
  amountToCredit: number;
  currency: string;
  paymentMode: string;
  feeType: "FIXED" | "PERCENTAGE";
  feeAmount: number;
  taxRate: number;
  taxAmount: number;
  platformProfit: number;
  status: "PENDING" | "COMPLETED" | "FAILED" | "DISPUTED";
  utr?: string;
  gatewayName?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  notes?: string;
  chargebackRaised?: boolean;
  chargebackRejected?: boolean;
  chargebackStatus?: "RAISED" | "REJECTED" | null;
  requestedAt: string;
  updatedAt: string;
  createdAt: string;
  gateway?: { id: number; name: string };
  merchant?: { id: number; name: string };
  user?: { id: number; fullName: string; email: string };
  metadata?: {
    utr?: string;
    responseLog?: { data?: { payment?: { utr?: string } } };
  };
}

export interface PayInRequestStats {
  pendingPayIns: number;
  completedPayIns: number;
  failedPayIns: number;
}

export interface PayInRequestFilters {
  status?: string;
  gatewayName?: string;
  merchantId?: string;
  userId?: string;
  search?: string;
  utr?: string;
  paymentMode?: string;
  feeType?: string;
  amountMin?: string;
  amountMax?: string;
  dateFrom?: Date | null;
  dateTo?: Date | null;
  offset?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "ASC" | "DESC";
}

export interface PayInRequestListResponse {
  data: PayInRequest[];
  total: number;
  offset: number;
  limit: number;
}

export interface PayInRequestStatsResponse {
  pending: number;
  approved: number;
  rejected: number;
}

export interface UpdatePayInRequestStatusPayload {
  status: "PENDING" | "COMPLETED" | "FAILED" | "DISPUTED";
  notes?: string;
}

export interface ExportPayInRequestFilters {
  status?: string;
  paymentMode?: string;
  gatewayId?: string | number;
  merchantId?: string;
  userId?: string;
  search?: string;
  amountMin?: string;
  amountMax?: string;
  feeType?: string;
  startDate?: string;
  endDate?: string;
}

export interface FilterOption {
  id: number | string;
  name: string;
  email?: string;
  merchantName?: string;
  fullName?: string;
  gateway_name?: string;
  gatewayName?: string;
}
