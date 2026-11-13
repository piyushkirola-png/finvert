import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { dashboardService } from "../services/dashboardService";
import type { DashboardFilters } from "../../types/dashboard";

type RecentFilters = Pick<
  DashboardFilters,
  "merchantId" | "gatewayId" | "userId"
>;

export const dashboardKeys = {
  all: ["dashboard"] as const,
  stats: (filters?: DashboardFilters) =>
    [...dashboardKeys.all, "stats", filters] as const,
  transactions: (filters?: RecentFilters) =>
    [...dashboardKeys.all, "transactions", filters] as const,
  merchants: () => [...dashboardKeys.all, "merchants"] as const,
  gateways: () => [...dashboardKeys.all, "gateways"] as const,
  users: () => [...dashboardKeys.all, "users"] as const,
};

export const useDashboardStats = (filters?: DashboardFilters) =>
  useQuery({
    queryKey: dashboardKeys.stats(filters),
    queryFn: () => dashboardService.getStats(filters),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });

export const useRecentTransactions = (filters?: RecentFilters) =>
  useQuery({
    queryKey: dashboardKeys.transactions(filters),
    queryFn: () => dashboardService.getRecentTransactions(filters),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });

export const useDashboardMerchants = (enabled = true) =>
  useQuery({
    queryKey: dashboardKeys.merchants(),
    queryFn: () => dashboardService.getMerchants(),
    enabled,
  });

export const useDashboardGateways = (enabled = true) =>
  useQuery({
    queryKey: dashboardKeys.gateways(),
    queryFn: () => dashboardService.getGateways(),
    enabled,
  });

export const useDashboardUsers = (enabled = true) =>
  useQuery({
    queryKey: dashboardKeys.users(),
    queryFn: () => dashboardService.getUsers(),
    enabled,
  });
