import { useQuery } from "@tanstack/react-query";
import { analyticsService } from "../services/analyticsService";
import type { AnalyticsFilters } from "../../types/analytics";

export const analyticsKeys = {
  all: ["analytics"] as const,
  transactionVolume: (filters?: AnalyticsFilters) =>
    [...analyticsKeys.all, "transactionVolume", filters] as const,
  paymentMethods: (filters?: AnalyticsFilters) =>
    [...analyticsKeys.all, "paymentMethods", filters] as const,
  hourlyVolume: (filters?: AnalyticsFilters) =>
    [...analyticsKeys.all, "hourlyVolume", filters] as const,
  gatewayPerformance: (filters?: AnalyticsFilters) =>
    [...analyticsKeys.all, "gatewayPerformance", filters] as const,
  transactionComposition: (filters?: AnalyticsFilters) =>
    [...analyticsKeys.all, "transactionComposition", filters] as const,
  merchantPerformance: (filters?: AnalyticsFilters) =>
    [...analyticsKeys.all, "merchantPerformance", filters] as const,
  merchants: () => [...analyticsKeys.all, "merchants"] as const,
  gateways: () => [...analyticsKeys.all, "gateways"] as const,
  users: () => [...analyticsKeys.all, "users"] as const,
};

export const useTransactionVolume = (filters?: AnalyticsFilters) =>
  useQuery({
    queryKey: analyticsKeys.transactionVolume(filters),
    queryFn: ({ signal }) =>
      analyticsService.getTransactionVolume(filters, signal),
  });

export const usePaymentMethods = (filters?: AnalyticsFilters) =>
  useQuery({
    queryKey: analyticsKeys.paymentMethods(filters),
    queryFn: ({ signal }) =>
      analyticsService.getPaymentMethods(filters, signal),
  });

export const useHourlyVolume = (filters?: AnalyticsFilters) =>
  useQuery({
    queryKey: analyticsKeys.hourlyVolume(filters),
    queryFn: ({ signal }) => analyticsService.getHourlyVolume(filters, signal),
  });

export const useGatewayPerformance = (filters?: AnalyticsFilters) =>
  useQuery({
    queryKey: analyticsKeys.gatewayPerformance(filters),
    queryFn: ({ signal }) =>
      analyticsService.getGatewayPerformance(filters, signal),
  });

export const useTransactionComposition = (filters?: AnalyticsFilters) =>
  useQuery({
    queryKey: analyticsKeys.transactionComposition(filters),
    queryFn: ({ signal }) =>
      analyticsService.getTransactionComposition(filters, signal),
  });

export const useMerchantPerformance = (filters?: AnalyticsFilters) =>
  useQuery({
    queryKey: analyticsKeys.merchantPerformance(filters),
    queryFn: ({ signal }) =>
      analyticsService.getMerchantPerformance(filters, signal),
  });

export const useAnalyticsMerchants = () =>
  useQuery({
    queryKey: analyticsKeys.merchants(),
    queryFn: () => analyticsService.getMerchants(),
  });

export const useAnalyticsGateways = () =>
  useQuery({
    queryKey: analyticsKeys.gateways(),
    queryFn: () => analyticsService.getGateways(),
  });

export const useAnalyticsUsers = () =>
  useQuery({
    queryKey: analyticsKeys.users(),
    queryFn: () => analyticsService.getUsers(),
  });
