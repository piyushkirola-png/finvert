export interface BulkUploadRow {
  id: number;
  rowNumber: number;
  status: "SUCCESS" | "FAILED";
  errorMessage?: string;
  merchantReference?: string;
  amount?: string;
}

export interface BulkUploadRecord {
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
  createdAt: string;
  processedAt: string | null;
  merchant: { id: number; name: string; email: string };
  user: { id: number; fullName: string; email: string };
  rows?: BulkUploadRow[];
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
  upiIntentFileUrl?: string | null;
  upiIntentCount?: number | null;
}

export interface BulkUploadStats {
  total: number;
  completed: number;
  failed: number;
  processing: number;
}

export interface BulkUploadFilters {
  status?: string;
  offset?: number;
  limit?: number;
}

export interface BulkUploadListResponse {
  data: BulkUploadRecord[];
  total: number;
  offset: number;
  limit: number;
}

export interface BulkUploadDetailResponse {
  data: BulkUploadRecord;
}

export interface PauseBulkUploadResponse {
  message: string;
  data: BulkUploadRecord;
}

export interface ResumeBulkUploadResponse {
  message: string;
  data: BulkUploadRecord;
}
