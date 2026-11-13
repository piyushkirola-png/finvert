import api from "../../lib/api-client";
import type { DashboardFilters, DashboardStats } from "../../types/dashboard";

const buildParams = (filters?: DashboardFilters) => {
  const params: Record<string, string> = {};
  if (filters?.merchantId) params.merchantId = filters.merchantId;
  if (filters?.gatewayId) params.gatewayId = filters.gatewayId;
  if (filters?.userId) params.userId = filters.userId;
  if (filters?.dateRange) params.dateRange = filters.dateRange;
  if (filters?.customStartDate)
    params.customStartDate = filters.customStartDate;
  if (filters?.customEndDate) params.customEndDate = filters.customEndDate;
  return params;
};

export const dashboardService = {
  getStats: async (filters?: DashboardFilters) => {
    const { data } = await api.get("/dashboard/stats", {
      params: buildParams(filters),
    });
    return data.data as DashboardStats;
  },

  getRecentTransactions: async (filters?: DashboardFilters) => {
    const { data } = await api.get("/dashboard/recent-transactions", {
      params: buildParams(filters),
    });
    return data.data ?? [];
  },

  getMerchants: async () => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "null");
      if (user?.role !== "ADMIN" && user?.role !== "SUPER_ADMIN") return [];
      const { data } = await api.get("/merchants");
      return data.data ?? [];
    } catch {
      return [];
    }
  },

  getGateways: async () => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "null");
      if (user?.role !== "ADMIN" && user?.role !== "SUPER_ADMIN") return [];
      const { data } = await api.get("/gateway");
      return data.data ?? [];
    } catch {
      return [];
    }
  },

  getUsers: async () => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "null");
      if (user?.role !== "ADMIN" && user?.role !== "SUPER_ADMIN") return [];
      const { data } = await api.get("/users");
      return data.users ?? [];
    } catch {
      return [];
    }
  },
};
