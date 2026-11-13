import { useQuery } from "@tanstack/react-query";
import api from "../../lib/api-client";
import type { MerchantStats } from "../../types/merchant";

export const merchantKeys = {
  all: ["merchants"] as const,
  lists: () => [...merchantKeys.all, "list"] as const,
  list: (params?: any) => [...merchantKeys.lists(), params] as const,
  details: () => [...merchantKeys.all, "detail"] as const,
  detail: (id: number) => [...merchantKeys.details(), id] as const,
  stats: () => [...merchantKeys.all, "stats"] as const,
  documents: (merchantId: number) =>
    [...merchantKeys.all, "documents", merchantId] as const,
  rates: (merchantId: number) =>
    [...merchantKeys.all, "rates", merchantId] as const,
  ipWhitelist: (merchantId: number) =>
    [...merchantKeys.all, "ipwhitelist", merchantId] as const,
};

export const useMerchants = (params?: { status?: string; search?: string }) =>
  useQuery({
    queryKey: merchantKeys.list(params),
    queryFn: async () => {
      const { data } = await api.get("/merchants", { params });
      return data.data ?? data ?? [];
    },
  });

export const useMerchant = (id: number) =>
  useQuery({
    queryKey: merchantKeys.detail(id),
    queryFn: async () => {
      const { data } = await api.get(`/merchants/merchant-summary/${id}`);
      return data.data ?? data;
    },
    enabled: !!id,
  });

export const useMerchantStats = () =>
  useQuery({
    queryKey: merchantKeys.stats(),
    queryFn: async () => {
      const { data } = await api.get("/merchants/stats");
      const result = data.data ?? data;
      return {
        totalMerchants: result.totalMerchants ?? 0,
        activeMerchants: result.activeMerchants ?? 0,
        pendingMerchants: result.pendingMerchants ?? 0,
      } as MerchantStats;
    },
  });

export const useMerchantDocuments = (merchantId: number) =>
  useQuery({
    queryKey: merchantKeys.documents(merchantId),
    queryFn: async () => {
      const { data } = await api.get(`/merchant-documents/${merchantId}`);
      return data.data ?? [];
    },
    enabled: !!merchantId,
  });

export const useMerchantRates = (merchantId: number) =>
  useQuery({
    queryKey: merchantKeys.rates(merchantId),
    queryFn: async () => {
      const { data } = await api.get(`/merchant-rates/${merchantId}`);
      return data.data ?? [];
    },
    enabled: !!merchantId,
  });

export const useMerchantIPWhitelist = (merchantId: number) =>
  useQuery({
    queryKey: merchantKeys.ipWhitelist(merchantId),
    queryFn: async () => {
      const { data } = await api.get(`/merchants/${merchantId}/whitelist-ips`);
      return data.data?.ips ?? [];
    },
    enabled: !!merchantId,
  });
