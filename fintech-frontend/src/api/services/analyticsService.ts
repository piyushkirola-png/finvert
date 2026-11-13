import api from "../../lib/api-client";
import type {
  AnalyticsFilters,
  TransactionVolumeData,
  PaymentMethodData,
  HourlyVolumeData,
  GatewayPerformanceData,
  TransactionCompositionData,
  MerchantPerformanceData,
  Merchant,
  Gateway,
  User,
} from "../../types/analytics";

const buildParams = (filters?: AnalyticsFilters) => {
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

export const analyticsService = {
  getTransactionVolume: async (
    filters?: AnalyticsFilters,
    signal?: AbortSignal,
  ) => {
    const { data } = await api.get("/analytics/transaction-volume", {
      params: buildParams(filters),
      signal,
    });
    return data.data as TransactionVolumeData;
  },

  getPaymentMethods: async (
    filters?: AnalyticsFilters,
    signal?: AbortSignal,
  ) => {
    const { data } = await api.get("/analytics/payment-methods", {
      params: buildParams(filters),
      signal,
    });
    return data.data as PaymentMethodData[];
  },

  getHourlyVolume: async (filters?: AnalyticsFilters, signal?: AbortSignal) => {
    const { data } = await api.get("/analytics/hourly-volume", {
      params: buildParams(filters),
      signal,
    });
    return data.data as HourlyVolumeData;
  },

  getGatewayPerformance: async (
    filters?: AnalyticsFilters,
    signal?: AbortSignal,
  ) => {
    const { data } = await api.get("/analytics/gateway-performance", {
      params: buildParams(filters),
      signal,
    });
    return data.data as GatewayPerformanceData[];
  },

  getTransactionComposition: async (
    filters?: AnalyticsFilters,
    signal?: AbortSignal,
  ) => {
    const { data } = await api.get("/analytics/transaction-composition", {
      params: buildParams(filters),
      signal,
    });
    return data.data as TransactionCompositionData;
  },

  getMerchantPerformance: async (
    filters?: AnalyticsFilters,
    signal?: AbortSignal,
  ) => {
    const { data } = await api.get("/analytics/merchant-performance", {
      params: buildParams(filters),
      signal,
    });
    return data.data as MerchantPerformanceData[];
  },

  getMerchants: async () => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "null");
      if (user?.role !== "ADMIN" && user?.role !== "SUPER_ADMIN") return [];
      const { data } = await api.get("/merchants");
      return data.data as Merchant[];
    } catch {
      return [];
    }
  },

  getGateways: async () => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "null");
      if (user?.role !== "ADMIN" && user?.role !== "SUPER_ADMIN") return [];
      const { data } = await api.get("/gateway");
      return data.data as Gateway[];
    } catch {
      return [];
    }
  },

  getUsers: async () => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "null");
      if (user?.role !== "ADMIN" && user?.role !== "SUPER_ADMIN") return [];
      const { data } = await api.get("/users");
      return data.users as User[];
    } catch {
      return [];
    }
  },
};
