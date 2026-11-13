import api from "../../lib/api-client";
import type {
  PayoutBulkUploadRecord,
  PayoutBulkUploadStats,
  PayoutBulkUploadFilters,
  PayoutBulkUploadListResponse,
  CreatePayoutBulkUploadPayload,
  PauseBulkUploadResponse,
  ResumeBulkUploadResponse,
  RetryBulkUploadResponse,
  CreateSinglePayoutPayload,
  SinglePayoutResponse,
} from "../../types/payoutBulkUpload";

const historyPath = (isAdmin: boolean) =>
  isAdmin ? "/payout-bulk-upload/admin/history" : "/payout-bulk-upload/history";

const detailPath = (id: number, isAdmin: boolean) =>
  isAdmin ? `/payout-bulk-upload/admin/${id}` : `/payout-bulk-upload/${id}`;

export const getPayoutBulkUploadHistory = async (
  filters: PayoutBulkUploadFilters,
  isAdmin: boolean,
): Promise<PayoutBulkUploadListResponse> => {
  const params: Record<string, unknown> = {
    offset: filters.offset ?? 0,
    limit: Math.min(filters.limit ?? 10, 100),
  };
  if (filters.status && filters.status !== "ALL")
    params.status = filters.status;

  const { data } = await api.get(historyPath(isAdmin), { params });

  return {
    data: data?.data ?? [],
    total: data?.total ?? 0,
    offset: data?.offset ?? 0,
    limit: data?.limit ?? 10,
  };
};

export const getPayoutBulkUploadStats = async (
  statusFilter: string | undefined,
  isAdmin: boolean,
): Promise<PayoutBulkUploadStats> => {
  // For user role, the backend has no /stats endpoint — paginate and aggregate
  if (!isAdmin) {
    const PAGE_LIMIT = 100;
    let offset = 0;
    let hasMore = true;
    const all: PayoutBulkUploadRecord[] = [];

    while (hasMore) {
      const params: Record<string, unknown> = { offset, limit: PAGE_LIMIT };
      if (statusFilter && statusFilter !== "ALL") params.status = statusFilter;

      const { data } = await api.get("/payout-bulk-upload/history", { params });
      const page: PayoutBulkUploadRecord[] = data?.data ?? [];
      all.push(...page);
      hasMore = page.length === PAGE_LIMIT;
      offset += PAGE_LIMIT;
    }

    return {
      total: all.length,
      completed: all.filter((r) => r.status === "COMPLETED").length,
      failed: all.filter((r) => r.status === "FAILED").length,
      processing: all.filter(
        (r) => r.status === "PROCESSING" || r.status === "PENDING",
      ).length,
    };
  }

  const PAGE_LIMIT = 100;
  let offset = 0;
  let hasMore = true;
  const all: PayoutBulkUploadRecord[] = [];

  while (hasMore) {
    const params: Record<string, unknown> = { offset, limit: PAGE_LIMIT };
    if (statusFilter && statusFilter !== "ALL") params.status = statusFilter;

    const { data } = await api.get("/payout-bulk-upload/admin/history", {
      params,
    });
    const page: PayoutBulkUploadRecord[] = data?.data ?? [];
    all.push(...page);
    hasMore = page.length === PAGE_LIMIT;
    offset += PAGE_LIMIT;
  }

  return {
    total: all.length,
    completed: all.filter((r) => r.status === "COMPLETED").length,
    failed: all.filter((r) => r.status === "FAILED").length,
    processing: all.filter(
      (r) => r.status === "PROCESSING" || r.status === "PENDING",
    ).length,
  };
};

export const getPayoutBulkUploadById = async (
  id: number,
  isAdmin: boolean,
): Promise<PayoutBulkUploadRecord> => {
  const { data } = await api.get(detailPath(id, isAdmin));
  return data?.data ?? (null as unknown as PayoutBulkUploadRecord);
};

export const createPayoutBulkUpload = async (
  payload: CreatePayoutBulkUploadPayload,
): Promise<PayoutBulkUploadRecord> => {
  const formData = new FormData();
  formData.append("file", payload.file);
  formData.append("mode", payload.mode);

  // 'type' is admin-only in the old code; user didn't send it
  if (payload.type) formData.append("type", payload.type);

  if (payload.mode === "scheduled") {
    formData.append("scheduleType", payload.scheduleType ?? "immediate");
    formData.append("scheduledTime", payload.scheduledTime ?? "");
    if (payload.scheduleType === "interval") {
      formData.append("intervalValue", String(payload.intervalValue ?? 1));
      formData.append("intervalUnit", payload.intervalUnit ?? "minutes");
    }
  }

  const { data } = await api.post("/payout-bulk-upload/", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return data?.data ?? data;
};

export const pausePayoutBulkUpload = async (
  id: number,
): Promise<PauseBulkUploadResponse> => {
  const { data } = await api.post(`/payout-bulk-upload/${id}/pause`, {});
  return data;
};

export const resumePayoutBulkUpload = async (
  id: number,
): Promise<ResumeBulkUploadResponse> => {
  const { data } = await api.post(`/payout-bulk-upload/${id}/resume`, {});
  return data;
};

export const retryPayoutBulkUpload = async (
  id: number,
): Promise<RetryBulkUploadResponse> => {
  const { data } = await api.post(`/payout-bulk-upload/${id}/retry`, {});
  return data;
};

export const downloadPayoutBulkUploadErrorReport = async (
  id: number,
): Promise<Blob> => {
  const { data } = await api.get(`/payout-bulk-upload/${id}/error-report`, {
    responseType: "blob",
  });
  return data;
};

export const downloadPayoutBulkUploadTemplate = async (): Promise<Blob> => {
  const { data } = await api.get("/payout-bulk-upload/template/download", {
    responseType: "blob",
  });
  return data;
};

export const createSinglePayout = async (
  payload: CreateSinglePayoutPayload,
): Promise<SinglePayoutResponse> => {
  const { data } = await api.post("/payout-bulk-upload/single", payload);
  return data?.data ?? data;
};
