export interface PayoutBulkUploadRow {
  id: number;
  rowNumber: number;
  status: "SUCCESS" | "FAILED";
  errorMessage?: string;
  merchantReference?: string;
  amount?: string;
  beneficiaryName?: string;
  beneficiaryAccount?: string;
  beneficiaryBank?: string;
  beneficiaryIfsc?: string;
  paymentMode?: string;
}

export interface PayoutBulkUploadRecord {
  id: number;
  fileName: string;
  totalRows: number;
  successRows: number;
  failedRows: number;
  status:
    | "COMPLETED"
    | "PROCESSING"
    | "FAILED"
    | "PENDING"
    | "PAUSED"
    | "PARTIAL_SUCCESS";
  mode?: string;
  type: string;
  createdAt: string;
  processedAt: string | null;
  merchant: { id: number; name: string; email: string };
  user: { id: number; fullName: string; email: string };
  rows?: PayoutBulkUploadRow[];
  scheduledTask?: {
    id: number;
    scheduledTime: string;
    status: string;
    processedAt: string | null;
  } | null;
  errorReport?: {
    summary: { totalErrors: number; errorTypes: Record<string, number> };
    details: Array<{
      rowNumber: number;
      merchantReference: string | null;
      error: string;
      timestamp: string;
    }>;
  } | null;
}

export interface PayoutBulkUploadStats {
  total: number;
  completed: number;
  failed: number;
  processing: number;
}

export interface PayoutBulkUploadFilters {
  status?: string;
  offset?: number;
  limit?: number;
}

export interface PayoutBulkUploadListResponse {
  data: PayoutBulkUploadRecord[];
  total: number;
  offset: number;
  limit: number;
}

export interface PayoutBulkUploadDetailResponse {
  data: PayoutBulkUploadRecord;
}

export interface CreatePayoutBulkUploadPayload {
  file: File;
  mode: "instant" | "scheduled";
  type?: string;
  scheduleType?: "immediate" | "interval";
  scheduledTime?: string;
  intervalValue?: number;
  intervalUnit?: "minutes" | "seconds";
}

export interface PauseBulkUploadResponse {
  message: string;
  data: PayoutBulkUploadRecord;
}

export interface ResumeBulkUploadResponse {
  message: string;
  data: PayoutBulkUploadRecord;
}

export interface RetryBulkUploadResponse {
  message: string;
  data: PayoutBulkUploadRecord;
}

export interface DownloadTemplateResponse {
  data: Blob;
}

export interface CreateSinglePayoutPayload {
  amount: number;
  merchantReference: string;
  paymentMode: "BANK" | "UPI" | "RTGS" | "NEFT" | "IMPS";
  beneficiary: {
    name: string;
    accountNumber: string;
    ifsc: string;
    bankName: string;
    email?: string;
    mobile?: string;
  };
  notes?: string;
}

export interface SinglePayoutResponse {
  id: number;
  status: string;
  merchantReference: string;
  amount: number;
  paymentMode: string;
  beneficiaryName: string | null;
  beneficiaryAccount: string | null;
  beneficiaryBank: string | null;
  beneficiaryIfsc: string | null;
  requestedAt: string;
  createdAt: string;
}
