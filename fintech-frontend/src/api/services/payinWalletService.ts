import api from "../../lib/api-client";
import type {
  PayinWalletTransaction,
  PayinWalletSummary,
  PayinWalletFilters,
  PayinWalletListResponse,
  PayinWalletStats,
  ExportPayinWalletFilters,
  FilterOption,
} from "../../types/payinWallet";

export const getPayinWalletTransactions = async (
  filters: PayinWalletFilters,
): Promise<PayinWalletListResponse> => {
  const params: Record<string, unknown> = {
    offset: filters.offset ?? 0,
    limit: filters.limit ?? 10,
  };
  if (filters.type && filters.type !== "All") params.type = filters.type;
  if (filters.userId) params.userId = filters.userId;
  if (filters.merchantId) params.merchantId = filters.merchantId;
  if (filters.transactionId) params.transactionId = filters.transactionId;
  if (filters.referenceId) params.referenceId = filters.referenceId;
  if (filters.search) params.search = filters.search;
  if (filters.amountMin) params.amountMin = filters.amountMin;
  if (filters.amountMax) params.amountMax = filters.amountMax;
  if (filters.dateFrom)
    params.startDate = filters.dateFrom.toISOString().split("T")[0];
  if (filters.dateTo)
    params.endDate = filters.dateTo.toISOString().split("T")[0];

  const { data } = await api.get("/payin-wallets", { params });

  return {
    data: data.data ?? [],
    total: data.total ?? 0,
    offset: data.offset ?? 0,
    limit: data.limit ?? 10,
  };
};

export const getPayinWalletSummary = async (): Promise<PayinWalletSummary> => {
  const { data } = await api.get("/payin-wallet-summaries");

  let summary: any = data.data?.[0] ?? data;

  if (Array.isArray(data.data) && data.data.length > 0) {
    summary = data.data.reduce((latest: any, current: any) => {
      const latestDate = latest?.lastRefreshedAt
        ? new Date(latest.lastRefreshedAt)
        : new Date(0);
      const currentDate = current?.lastRefreshedAt
        ? new Date(current.lastRefreshedAt)
        : new Date(0);
      return currentDate > latestDate ? current : latest;
    });
  }

  return {
    closingBalance: summary?.closingBalance ?? 0,
    totalInToday: summary?.totalInToday ?? 0,
    netChargesToday: summary?.netChargesToday ?? 0,
    lastRefreshedAt: summary?.lastRefreshedAt ?? new Date().toISOString(),
  };
};

export const getPayinRequestStats = async (): Promise<PayinWalletStats> => {
  try {
    const { data } = await api.get("/payin-requests/stats");
    return {
      approved: data.approved ?? 0,
      rejected: data.rejected ?? 0,
      pending: data.pending ?? 0,
    };
  } catch {
    return { approved: 0, rejected: 0, pending: 0 };
  }
};

export const refreshPayinWalletSummary = async (
  merchantId?: number | null,
  userId?: number | null,
): Promise<void> => {
  if (merchantId) {
    await api.post(`/payin-wallet-summaries/merchant/${merchantId}/refresh`, {
      userId,
    });
  } else {
    await api.post("/payin-wallet-summaries/refresh-all", {});
  }
};

export const getPayinWalletTransactionById = async (
  id: number,
): Promise<PayinWalletTransaction> => {
  const { data } = await api.get(`/payin-wallets/${id}`);
  return data.data ?? data;
};

export const exportPayinWalletCSV = async (
  filters: ExportPayinWalletFilters,
): Promise<void> => {
  const params: Record<string, unknown> = {};
  if (filters.type && filters.type !== "All") params.type = filters.type;
  if (filters.userId) params.userId = filters.userId;
  if (filters.merchantId) params.merchantId = filters.merchantId;
  if (filters.transactionId) params.transactionId = filters.transactionId;
  if (filters.referenceId) params.referenceId = filters.referenceId;
  if (filters.search) params.search = filters.search;
  if (filters.amountMin) params.amountMin = filters.amountMin;
  if (filters.amountMax) params.amountMax = filters.amountMax;
  if (filters.startDate) params.startDate = filters.startDate;
  if (filters.endDate) params.endDate = filters.endDate;

  await api.get("/payin-wallets/export/csv", { params });
};

export const getPayinWalletFilterOptions = async (): Promise<{
  merchants: FilterOption[];
}> => {
  try {
    const stored = localStorage.getItem("user");
    const user = stored ? JSON.parse(stored) : null;
    const isAdmin = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";

    if (!isAdmin) {
      return { merchants: [] };
    }

    const { data } = await api.get("/merchants");
    const merchants = data.data ?? data;
    return { merchants: Array.isArray(merchants) ? merchants : [] };
  } catch {
    return { merchants: [] };
  }
};
