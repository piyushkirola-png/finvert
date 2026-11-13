import api from "../../lib/api-client";
import type {
  PayoutWalletTransaction,
  PayoutWalletSummary,
  PayoutWalletFilters,
  PayoutWalletListResponse,
  PayoutWalletStats,
  ExportPayoutWalletFilters,
  FilterOption,
} from "../../types/payoutWallet";

export const getPayoutWalletTransactions = async (
  filters: PayoutWalletFilters,
): Promise<PayoutWalletListResponse> => {
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

  const { data } = await api.get("/payout-wallets", { params });

  return {
    data: data.data ?? [],
    total: data.total ?? 0,
    offset: data.offset ?? 0,
    limit: data.limit ?? 10,
  };
};

export const getPayoutWalletSummary =
  async (): Promise<PayoutWalletSummary> => {
    const { data } = await api.get("/payout-wallet-summaries");

    let summary: any = data?.data;

    if (Array.isArray(summary)) {
      summary = summary.reduce(
        (acc: any, row: any) => ({
          closingBalance:
            (acc.closingBalance ?? 0) + Number(row.closingBalance ?? 0),
          totalOutToday:
            (acc.totalOutToday ?? 0) + Number(row.totalOutToday ?? 0),
          totalChargesToday:
            (acc.totalChargesToday ?? 0) + Number(row.totalChargesToday ?? 0),
          lastRefreshedAt:
            !acc.lastRefreshedAt || row.lastRefreshedAt > acc.lastRefreshedAt
              ? row.lastRefreshedAt
              : acc.lastRefreshedAt,
        }),
        {},
      );
    }

    if (!summary) summary = {};

    return {
      closingBalance: summary?.closingBalance ?? 0,
      totalOutToday: summary?.totalOutToday ?? 0,
      totalChargesToday: summary?.totalChargesToday ?? 0,
      lastRefreshedAt: summary?.lastRefreshedAt ?? new Date().toISOString(),
    };
  };

export const getPayoutRequestStats = async (): Promise<PayoutWalletStats> => {
  try {
    const { data } = await api.get("/payout-requests/stats");
    return {
      completed: data.completed ?? 0,
      failed: data.failed ?? 0,
      pending: data.pending ?? 0,
    };
  } catch {
    return { completed: 0, failed: 0, pending: 0 };
  }
};

export const refreshPayoutWalletSummary = async (
  merchantId?: number | null,
): Promise<void> => {
  if (merchantId) {
    await api.post(`/payout-wallet-summaries/${merchantId}/refresh`, {});
  } else {
    await api.post("/payout-wallet-summaries/refresh-all", {});
  }
};

export const getPayoutWalletTransactionById = async (
  id: number,
): Promise<PayoutWalletTransaction> => {
  const { data } = await api.get(`/payout-wallets/transactions/${id}`);
  return data.data ?? data;
};

export const exportPayoutWalletCSV = async (
  filters: ExportPayoutWalletFilters,
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

  await api.get("/payout-wallets/export/csv", { params });
};

export const getPayoutWalletFilterOptions = async (): Promise<{
  merchants: FilterOption[];
  users: FilterOption[];
}> => {
  try {
    const stored = localStorage.getItem("user");
    const user = stored ? JSON.parse(stored) : null;
    const isAdmin = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";

    if (!isAdmin) {
      return { merchants: [], users: [] };
    }

    const [m, u] = await Promise.all([
      api.get("/merchants"),
      api.get("/users"),
    ]);
    return {
      merchants: m.data.data ?? m.data ?? [],
      users: u.data.users ?? u.data.data ?? [],
    };
  } catch {
    return { merchants: [], users: [] };
  }
};
