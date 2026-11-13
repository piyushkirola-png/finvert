import api from "../../lib/api-client";
import type {
  PayoutRequest,
  PayoutRequestStats,
  PayoutRequestFilters,
  PayoutRequestListResponse,
  UpdatePayoutRequestStatusPayload,
  ExportPayoutRequestFilters,
  FilterOption,
} from "../../types/payoutRequest";

export const getPayoutRequests = async (
  filters: PayoutRequestFilters,
): Promise<PayoutRequestListResponse> => {
  const params: Record<string, unknown> = {
    offset: filters.offset ?? 0,
    limit: filters.limit ?? 10,
    sortBy: filters.sortBy ?? "id",
    sortOrder: filters.sortOrder ?? "DESC",
  };

  if (filters.status && filters.status !== "All")
    params.status = filters.status;
  if (filters.paymentMode && filters.paymentMode !== "All")
    params.paymentMode = filters.paymentMode;
  if (filters.gatewayName && filters.gatewayName !== "All")
    params.gatewayName = filters.gatewayName;
  if (filters.merchantId) params.merchantId = filters.merchantId;
  if (filters.userId) params.userId = filters.userId;
  if (filters.search) params.search = filters.search;
  if (filters.utr) params.utr = filters.utr;
  if (filters.feeType && filters.feeType !== "All")
    params.feeType = filters.feeType;
  if (filters.amountMin) params.amountMin = filters.amountMin;
  if (filters.amountMax) params.amountMax = filters.amountMax;
  if (filters.dateFrom)
    params.startDate = filters.dateFrom.toISOString().split("T")[0];
  if (filters.dateTo)
    params.endDate = filters.dateTo.toISOString().split("T")[0];

  const { data } = await api.get("/payout-requests", { params });

  return {
    data: data.data ?? [],
    total: data.total ?? 0,
    offset: data.offset ?? 0,
    limit: data.limit ?? 10,
  };
};

export const getPayoutRequestStats = async (): Promise<PayoutRequestStats> => {
  try {
    const { data } = await api.get("/payout-requests/stats");
    return {
      pendingPayouts: data.pending ?? 0,
      completedPayouts: data.completed ?? 0,
      failedPayouts: data.failed ?? 0,
    };
  } catch {
    return { pendingPayouts: 0, completedPayouts: 0, failedPayouts: 0 };
  }
};

export const getPayoutRequestById = async (
  id: number,
): Promise<PayoutRequest> => {
  const { data } = await api.get(`/payout-requests/${id}`);
  return data.data ?? data;
};

export const updatePayoutRequestStatus = async (
  id: number,
  payload: UpdatePayoutRequestStatusPayload,
): Promise<PayoutRequest> => {
  const { data } = await api.patch(`/payout-requests/${id}/status`, payload);
  return data.data ?? data;
};

export const exportPayoutRequestsCSV = async (
  filters: ExportPayoutRequestFilters,
): Promise<void> => {
  const params: Record<string, unknown> = {};
  if (filters.status && filters.status !== "All")
    params.status = filters.status;
  if (filters.paymentMode && filters.paymentMode !== "All")
    params.paymentMode = filters.paymentMode;
  if (filters.gatewayId) params.gatewayId = filters.gatewayId;
  if (filters.merchantId) params.merchantId = filters.merchantId;
  if (filters.userId) params.userId = filters.userId;
  if (filters.search) params.search = filters.search;
  if (filters.amountMin) params.amountMin = filters.amountMin;
  if (filters.amountMax) params.amountMax = filters.amountMax;
  if (filters.feeType && filters.feeType !== "All")
    params.feeType = filters.feeType;
  if (filters.startDate) params.startDate = filters.startDate;
  if (filters.endDate) params.endDate = filters.endDate;

  await api.get("/payout-requests/export/csv", { params });
};

export const getFilterOptions = async (): Promise<{
  merchants: FilterOption[];
  users: FilterOption[];
  gateways: FilterOption[];
}> => {
  try {
    const stored = localStorage.getItem("user");
    const user = stored ? JSON.parse(stored) : null;
    const isAdmin = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";

    if (!isAdmin) {
      return { merchants: [], users: [], gateways: [] };
    }

    const [m, u, g] = await Promise.all([
      api.get("/merchants"),
      api.get("/users", { params: { role: "USER", isActive: true } }),
      api.get("/gateway"),
    ]);
    return {
      merchants: m.data.data ?? m.data ?? [],
      users: u.data.users ?? u.data.data ?? [],
      gateways: g.data.data ?? g.data ?? [],
    };
  } catch {
    return { merchants: [], users: [], gateways: [] };
  }
};
