export interface PayoutRequest {
  id: number;
  orderId?: string;
  merchantReference?: string;
  userId: number;
  merchantId: number;
  vendorId?: number;
  gatewayId?: number;
  amount: number;
  amountToDebit: number;
  currency: string;
  paymentMode: string;
  feeType: "FIXED" | "PERCENTAGE";
  feeAmount: number;
  taxRate: number;
  taxAmount: number;
  platformProfit: number;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  utr?: string;
  vendorName?: string;
  gatewayName?: string;
  beneficiaryName?: string;
  beneficiaryAccount?: string;
  beneficiaryIfsc?: string;
  beneficiaryBank?: string;
  notes?: string;
  requestedAt: string;
  createdAt: string;
  updatedAt: string;
  vendor?: { id: number; name: string };
  gateway?: { id: number; name: string };
  merchant?: { id: number; name: string };
  user?: { id: number; fullName: string; email: string };
  metadata?: { utr?: string };
}

export interface PayoutRequestStats {
  pendingPayouts: number;
  completedPayouts: number;
  failedPayouts: number;
}

export interface PayoutRequestFilters {
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

export interface PayoutRequestListResponse {
  data: PayoutRequest[];
  total: number;
  offset: number;
  limit: number;
}

export interface UpdatePayoutRequestStatusPayload {
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  notes?: string;
}

export interface ExportPayoutRequestFilters {
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
  vendorName?: string;
}
