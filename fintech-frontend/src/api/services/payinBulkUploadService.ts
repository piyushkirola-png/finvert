import api from "../../lib/api-client";
import type {
  BulkUploadRecord,
  BulkUploadStats,
  BulkUploadFilters,
  BulkUploadListResponse,
  PauseBulkUploadResponse,
  ResumeBulkUploadResponse,
} from "../../types/payinBulkUpload";

const isAdminRole = () => {
  try {
    const raw =
      localStorage.getItem("user_user") || localStorage.getItem("user");
    if (!raw) return true;
    const u = JSON.parse(raw);
    return u?.role === "ADMIN";
  } catch {
    return true;
  }
};

const basePath = () =>
  isAdminRole() ? "/payin-bulk-upload/admin" : "/payin-bulk-upload";

export const getBulkUploadHistory = async (
  filters: BulkUploadFilters,
): Promise<BulkUploadListResponse> => {
  const params: Record<string, unknown> = {
    offset: filters.offset ?? 0,
    limit: Math.min(filters.limit ?? 10, 100),
  };
  if (filters.status && filters.status !== "ALL")
    params.status = filters.status;

  const { data } = await api.get(`${basePath()}/history`, { params });

  return {
    data: data?.data ?? [],
    total: data?.total ?? 0,
    offset: data?.offset ?? 0,
    limit: data?.limit ?? 10,
  };
};

export const getBulkUploadStats = async (
  statusFilter?: string,
): Promise<BulkUploadStats> => {
  const PAGE_LIMIT = 100;
  let offset = 0;
  let hasMore = true;
  const all: BulkUploadRecord[] = [];

  while (hasMore) {
    const params: Record<string, unknown> = { offset, limit: PAGE_LIMIT };
    if (statusFilter && statusFilter !== "ALL") params.status = statusFilter;

    const { data } = await api.get(`${basePath()}/history`, { params });
    const page: BulkUploadRecord[] = data?.data ?? [];
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

export const getBulkUploadById = async (
  id: number,
): Promise<BulkUploadRecord> => {
  const { data } = await api.get(`${basePath()}/${id}`);
  return data?.data ?? (null as unknown as BulkUploadRecord);
};

export const pauseBulkUpload = async (
  id: number,
): Promise<PauseBulkUploadResponse> => {
  const { data } = await api.post(`/payin-bulk-upload/${id}/pause`, {});
  return data;
};

export const resumeBulkUpload = async (
  id: number,
): Promise<ResumeBulkUploadResponse> => {
  const { data } = await api.post(`/payin-bulk-upload/${id}/resume`, {});
  return data;
};

export interface CreatePayinBulkUploadPayload {
  file: File;
  mode: "instant" | "scheduled";
  scheduleType?: "immediate" | "interval";
  scheduledTime?: string;
  intervalValue?: number;
  intervalUnit?: "minutes" | "seconds";
}

export const createPayinBulkUpload = async (
  payload: CreatePayinBulkUploadPayload,
): Promise<any> => {
  const formData = new FormData();
  formData.append("file", payload.file);
  formData.append("mode", payload.mode);
  if (payload.mode === "scheduled") {
    if (payload.scheduleType)
      formData.append("scheduleType", payload.scheduleType);
    if (payload.scheduledTime)
      formData.append("scheduledTime", payload.scheduledTime);
    if (payload.intervalValue != null)
      formData.append("intervalValue", String(payload.intervalValue));
    if (payload.intervalUnit)
      formData.append("intervalUnit", payload.intervalUnit);
  }

  const { data } = await api.post("/payin-bulk-upload/", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
};

export const downloadPayinBulkUploadTemplate = async (): Promise<void> => {
  const response = await api.get("/payin-bulk-upload/template/download", {
    responseType: "blob",
  });
  const url = window.URL.createObjectURL(response.data);
  const link = document.createElement("a");
  link.href = url;
  link.download = "payin-bulk-upload-template.csv";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

export const retryPayinBulkUpload = async (id: number): Promise<any> => {
  const { data } = await api.post(`/payin-bulk-upload/${id}/retry`, {});
  return data;
};

export const downloadPayinBulkUploadErrorReport = async (
  id: number,
): Promise<void> => {
  const response = await api.get(`/payin-bulk-upload/${id}/error-report`, {
    responseType: "blob",
  });
  const url = window.URL.createObjectURL(response.data);
  const link = document.createElement("a");
  link.href = url;
  link.download = `payin-error-report-${id}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

export const downloadPayinUpiIntents = async (id: number): Promise<void> => {
  const response = await api.get(`/payin-bulk-upload/${id}/upi-intents`, {
    responseType: "blob",
  });
  const url = window.URL.createObjectURL(response.data);
  const link = document.createElement("a");
  link.href = url;
  link.download = `upi-intents-${id}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};