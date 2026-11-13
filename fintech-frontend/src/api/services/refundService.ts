import api from "../../lib/api-client";
import type {
  Refund,
  RefundStats,
  RefundApiFilters,
  CreateRefundPayload,
} from "../../types/refund";

export const getRefunds = async (
  filters?: RefundApiFilters,
): Promise<{ data: Refund[]; total: number }> => {
  const { data } = await api.get("/refunds", { params: filters });
  return {
    data: data.data ?? [],
    total: data.total ?? 0,
  };
};

export const getRefundStats = async (): Promise<RefundStats> => {
  const { data } = await api.get("/refunds/stats");
  return {
    completed: data.completed ?? 0,
    processing: data.processing ?? 0,
    pending: data.pending ?? 0,
    failed: data.failed ?? 0,
    cancelled: data.cancelled ?? 0,
    totalAmount: data.totalAmount ?? 0,
  };
};

export const createRefund = async (
  payload: CreateRefundPayload,
): Promise<Refund> => {
  const { data } = await api.post("/refunds", payload);
  return data.data ?? data;
};

export const updateRefundStatus = async (
  id: number,
  status: string,
): Promise<void> => {
  await api.patch(`/refunds/${id}/status`, { status });
};

export const cancelRefund = async (id: number): Promise<void> => {
  await api.post(`/refunds/${id}/cancel`, { reason: "Cancelled by admin" });
};

export const exportRefunds = async (filters?: any): Promise<void> => {
  await api.get("/refunds/export/csv", { params: filters });
};

export const getMerchantsForFilters = async (): Promise<any[]> => {
  try {
    const stored = localStorage.getItem("user");
    const user = stored ? JSON.parse(stored) : null;
    const isAdmin = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";
    if (!isAdmin) return [];

    const { data } = await api.get("/merchants");
    const merchants = data.data ?? data;
    return Array.isArray(merchants) ? merchants : [];
  } catch {
    return [];
  }
};

export const getPayInRequestById = async (id: number): Promise<any> => {
  const { data } = await api.get(`/payin-requests/${id}`);
  return data.data ?? data;
};

export const getRefundsByPayInRequestId = async (
  payInRequestId: number,
): Promise<Refund[]> => {
  const { data } = await api.get("/refunds", { params: { payInRequestId } });
  return data.data ?? data ?? [];
};
